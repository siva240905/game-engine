import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

import authRouter from './routes/auth';
import statsRouter from './routes/stats';
import { setMongoConnected } from './models/Schemas';
import { RoomManager } from './game/RoomManager';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // In development, allow all origins
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hand_cricket';
const JWT_SECRET = process.env.JWT_SECRET || 'cricket_secret_key_12345';

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/stats', statsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', mongoConnected: mongoose.connection.readyState === 1 });
});

// Setup DB connection
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    setMongoConnected(true);
  })
  .catch((err) => {
    console.warn('MongoDB connection failed. Continuing server with In-Memory fallback DB.', err.message);
    setMongoConnected(false);
  });

// Room manager instance
const roomManager = RoomManager.getInstance();

// Auth Middleware for Sockets
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication token required'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
    socket.data.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid socket connection token'));
  }
});

// Socket.io Events Setup
io.on('connection', (socket) => {
  const user = socket.data.user;
  console.log(`User connected: ${user.username} (Socket: ${socket.id})`);

  // Check if player has an active match running (Reconnection feature)
  const existingRoom = roomManager.findRoomByUserId(user.userId);
  if (existingRoom && existingRoom.status !== 'finished') {
    // Reconnection mapping
    const player = existingRoom.addPlayer(socket.id, user.userId, user.username, '');
    socket.join(existingRoom.roomCode);
    console.log(`User reconnected to room: ${existingRoom.roomCode}`);
    
    // Broadcast reconnection
    io.to(existingRoom.roomCode).emit('playerReconnected', {
      username: user.username,
      gameState: existingRoom.getGameState()
    });
  }

  // Create Room Lobby
  socket.on('createRoom', ({ settings, vsBot, roomType, teamName }) => {
    try {
      const overs = settings?.overs || 1;
      const wickets = settings?.wickets || 1;
      const botRoom = !!vsBot;
      const type = roomType || 'single';
      
      const room = roomManager.createRoom({ overs, wickets }, io, botRoom, type);
      const player = room.addPlayer(
        socket.id, 
        user.userId, 
        user.username, 
        socket.handshake.auth?.avatar || 'avatar1',
        teamName
      );
      
      socket.join(room.roomCode);
      
      socket.emit('roomCreated', {
        roomCode: room.roomCode,
        player,
        gameState: room.getGameState()
      });

      console.log(`Room created: ${room.roomCode} by ${user.username} (vs Bot: ${botRoom}, Type: ${type})`);

      if (botRoom) {
        // Auto-start the match immediately for vs Bot games
        room.startMatch();
        io.to(room.roomCode).emit('matchStarted', {
          gameState: room.getGameState()
        });
        console.log(`Bot Match auto-started in room: ${room.roomCode}`);
      }
    } catch (err: any) {
      socket.emit('errorMsg', { message: err.message || 'Failed to create room.' });
    }
  });

  // Join Room Lobby
  socket.on('joinRoom', ({ roomCode, teamName }) => {
    try {
      if (!roomCode) {
        return socket.emit('errorMsg', { message: 'Room code is required' });
      }

      const room = roomManager.getRoom(roomCode);
      if (!room) {
        return socket.emit('errorMsg', { message: 'Room not found' });
      }

      if (room.status !== 'lobby') {
        // If already playing, check if this user was in the room to reconnect
        const isUserInRoom = room.players.some(p => p.userId === user.userId);
        if (!isUserInRoom) {
          return socket.emit('errorMsg', { message: 'Match is already in progress' });
        }
      }

      // Cap room size
      const maxLimit = room.roomType === 'tournament' ? 10 : 2;
      const isReconnecting = room.players.some(p => p.userId === user.userId);
      if (room.players.length >= maxLimit && !isReconnecting) {
        return socket.emit('errorMsg', { message: `Lobby room is full (max ${maxLimit} players)` });
      }

      // Add/Re-link player
      const player = room.addPlayer(
        socket.id, 
        user.userId, 
        user.username, 
        socket.handshake.auth?.avatar || 'avatar1',
        teamName
      );
      socket.join(room.roomCode);

      io.to(room.roomCode).emit('roomJoined', {
        roomCode: room.roomCode,
        players: room.players.map(p => ({
          userId: p.userId,
          username: p.username,
          avatar: p.avatar,
          ready: p.ready,
          role: p.role,
          isDisconnected: p.isDisconnected,
          teamName: p.teamName
        })),
        settings: room.settings,
        gameState: room.getGameState()
      });

      console.log(`User ${user.username} joined room ${room.roomCode} for team ${player.teamName}`);
    } catch (err: any) {
      socket.emit('errorMsg', { message: err.message || 'Failed to join room' });
    }
  });

  // Toggle Ready Status
  socket.on('playerReady', ({ ready }) => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (!room) return;

    room.setReady(user.userId, ready);

    io.to(room.roomCode).emit('roomStateUpdate', {
      players: room.players.map(p => ({
        userId: p.userId,
        username: p.username,
        avatar: p.avatar,
        ready: p.ready,
        role: p.role,
        isDisconnected: p.isDisconnected,
        teamName: p.teamName
      })),
      allReady: room.allReady()
    });
  });

  // Start Match or Tournament
  socket.on('startMatch', () => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (!room) return;

    if (!room.allReady()) {
      return socket.emit('errorMsg', { message: 'All players must be ready to start!' });
    }

    if (room.roomType === 'tournament') {
      room.startTournament();
      io.to(room.roomCode).emit('roomStateUpdate', {
        players: room.players.map(p => ({
          userId: p.userId,
          username: p.username,
          avatar: p.avatar,
          ready: p.ready,
          role: p.role,
          isDisconnected: p.isDisconnected,
          teamName: p.teamName
        })),
        gameState: room.getGameState()
      });
      console.log(`Tournament started in room: ${room.roomCode}`);
    } else {
      room.startMatch();
      io.to(room.roomCode).emit('matchStarted', {
        gameState: room.getGameState()
      });
      console.log(`Match started in room: ${room.roomCode}`);
    }
  });

  // Start specific scheduled Tournament match node
  socket.on('startTournamentMatch', ({ matchId }) => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (!room) return;

    room.startTournamentMatch(matchId);

    io.to(room.roomCode).emit('matchStarted', {
      gameState: room.getGameState()
    });
    console.log(`Tournament Match ${matchId} started in room: ${room.roomCode}`);
  });

  // Submit Number Choice
  socket.on('chooseNumber', ({ number }) => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (!room) return;

    const parsedNum = parseInt(number);
    if (isNaN(parsedNum) || parsedNum < 1 || parsedNum > 6) {
      return socket.emit('errorMsg', { message: 'Invalid choice. Must be 1-6.' });
    }

    room.submitChoice(user.userId, parsedNum);

    // Emit choiceMade updates to both players so they know who is waiting
    io.to(room.roomCode).emit('choiceUpdate', {
      gameState: room.getGameState()
    });
  });

  // Leave Room Explicitly
  socket.on('leaveRoom', () => {
    try {
      const room = roomManager.findRoomBySocketId(socket.id);
      if (room) {
        const isLobby = room.status === 'lobby' || room.status === 'tournament_bracket' || room.status === 'tournament_finished';
        const shouldDelete = room.removePlayer(socket.id);

        if (isLobby) {
          if (shouldDelete) {
            io.to(room.roomCode).emit('roomClosed', { message: 'Lobby closed by the host.' });
            roomManager.deleteRoom(room.roomCode);
            console.log(`Room deleted on host leave: ${room.roomCode}`);
          } else {
            // Broadcast update to remaining players
            io.to(room.roomCode).emit('roomStateUpdate', {
              players: room.players.map(p => ({
                userId: p.userId,
                username: p.username,
                avatar: p.avatar,
                ready: p.ready,
                role: p.role,
                isDisconnected: p.isDisconnected,
                teamName: p.teamName
              })),
              gameState: room.getGameState()
            });
            console.log(`Player left room. Room ${room.roomCode} updated.`);
          }
        }
        socket.leave(room.roomCode);
      }
    } catch (err) {
      console.error('Error leaving room:', err);
    }
  });

  // Send Lobby Chat Message
  socket.on('sendLobbyChat', ({ message }) => {
    try {
      const room = roomManager.findRoomBySocketId(socket.id);
      if (room) {
        io.to(room.roomCode).emit('lobbyChatReceived', {
          userId: user.userId,
          username: user.username,
          message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    } catch (err) {
      console.error('Error handling lobby chat:', err);
    }
  });

  // Leave / Disconnect
  socket.on('disconnect', () => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (room) {
      const isLobby = room.status === 'lobby';
      const shouldDelete = room.removePlayer(socket.id);

      if (isLobby) {
        if (shouldDelete) {
          io.to(room.roomCode).emit('roomClosed', { message: 'Lobby closed due to host disconnect.' });
          roomManager.deleteRoom(room.roomCode);
          console.log(`Lobby room deleted: ${room.roomCode}`);
        } else {
          // Broadcast to remaining players
          io.to(room.roomCode).emit('roomStateUpdate', {
            players: room.players.map(p => ({
              userId: p.userId,
              username: p.username,
              avatar: p.avatar,
              ready: p.ready,
              role: p.role,
              isDisconnected: p.isDisconnected,
              teamName: p.teamName
            })),
            gameState: room.getGameState()
          });
          console.log(`Player left lobby. Room ${room.roomCode} updated.`);
        }
      } else {
        // Playing and player disconnected, wait for reconnection
        io.to(room.roomCode).emit('playerDisconnected', {
          username: user.username
        });
        console.log(`User disconnected mid-game: ${user.username} from room ${room.roomCode}`);

        // Set a timer to delete room if no reconnect occurs in 90 seconds
        setTimeout(() => {
          const currentRoom = roomManager.getRoom(room.roomCode);
          if (currentRoom) {
            const player = currentRoom.players.find(p => p.userId === user.userId);
            if (player && player.isDisconnected) {
              roomManager.deleteRoom(room.roomCode);
              console.log(`Room ${room.roomCode} deleted due to inactivity of disconnected player`);
            }
          }
        }, 90000);
      }
    }
    console.log(`User disconnected: ${user.username}`);
  });
});

// Run HTTP/WS Server
server.listen(PORT, () => {
  console.log(`Hand Cricket Server running on http://localhost:${PORT}`);
});
