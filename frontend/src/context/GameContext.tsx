import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import sound from '../utils/audio';

export type ScreenType = 'auth' | 'home' | 'lobby' | 'match' | 'tournament_bracket';

export interface IPlayerState {
  userId: string;
  username: string;
  avatar: string;
  ready: boolean;
  role: 'bat' | 'bowl' | 'idle';
  isDisconnected: boolean;
  teamName: string;
}

export interface IBallReveal {
  isRevealing: boolean;
  step: '3' | '2' | '1' | 'reveal' | null;
  batterVal: number | null;
  bowlerVal: number | null;
  isWicket: boolean | null;
  runsScored: number | null;
  commentary: string | null;
}

export interface ITournamentMatch {
  id: string;
  player1: { userId: string; username: string; teamName: string; avatar: string } | null;
  player2: { userId: string; username: string; teamName: string; avatar: string } | null;
  score1: number;
  score2: number;
  winnerId: string | null;
  winnerName: string;
  status: 'pending' | 'playing' | 'completed' | 'bye';
  round: 'Round1' | 'Quarters' | 'Semis' | 'Final';
  nextMatchId: string | null;
}

export interface IGameState {
  roomCode: string;
  status: 'lobby' | 'playing' | 'innings_break' | 'finished' | 'tournament_bracket' | 'tournament_finished';
  roomType: 'single' | 'tournament';
  currentInnings: 1 | 2;
  target: number | null;
  inningsScore: number;
  inningsWickets: number;
  inningsBalls: number;
  overNumber: number;
  ballNumber: number;
  crr: number;
  rrr: number;
  recentBalls: string[];
  settings: {
    overs: number;
    wickets: number;
  };
  batter: {
    userId: string;
    username: string;
    avatar: string;
    score: number;
    choiceMade: boolean;
    teamName?: string;
  } | null;
  bowler: {
    userId: string;
    username: string;
    avatar: string;
    wickets: number;
    choiceMade: boolean;
    teamName?: string;
  } | null;
  players: IPlayerState[];
  timerValue: number;
  tournamentBracket?: ITournamentMatch[];
  currentMatchId?: string | null;
  tournamentWinnerName?: string;
}

interface GameContextType {
  socket: Socket | null;
  roomCode: string | null;
  players: IPlayerState[];
  settings: { overs: number; wickets: number } | null;
  gameState: IGameState | null;
  activeScreen: ScreenType;
  systemError: string | null;
  announcement: string | null;
  revealSequence: IBallReveal;
  screenShake: boolean;
  showConfetti: boolean;
  inningsBreakMsg: string | null;
  soundMuted: boolean;
  toggleSoundMute: () => void;
  createRoom: (overs: number, wickets: number, vsBot?: boolean, roomType?: 'single' | 'tournament', teamName?: string) => void;
  joinRoom: (roomCode: string, teamName?: string) => void;
  toggleReady: (ready: boolean) => void;
  startMatch: () => void;
  chooseNumber: (num: number) => void;
  leaveRoom: () => void;
  clearSystemError: () => void;
  startTournamentMatch: (matchId: string) => void;
  lobbyChatMessages: Array<{ userId: string; username: string; message: string; timestamp: string }>;
  sendLobbyChatMessage: (message: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [players, setPlayers] = useState<IPlayerState[]>([]);
  const [settings, setSettings] = useState<{ overs: number; wickets: number } | null>(null);
  const [gameState, setGameState] = useState<IGameState | null>(null);
  const [activeScreen, setActiveScreen] = useState<ScreenType>('auth');
  const [systemError, setSystemError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [screenShake, setScreenShake] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [inningsBreakMsg, setInningsBreakMsg] = useState<string | null>(null);
  const [soundMuted, setSoundMuted] = useState<boolean>(sound.getMute());
  const [lobbyChatMessages, setLobbyChatMessages] = useState<Array<{ userId: string; username: string; message: string; timestamp: string }>>([]);

  const [revealSequence, setRevealSequence] = useState<IBallReveal>({
    isRevealing: false,
    step: null,
    batterVal: null,
    bowlerVal: null,
    isWicket: null,
    runsScored: null,
    commentary: null,
  });

  const stateRef = useRef<IGameState | null>(null);

  // Sync ref to avoid closure capture issues in reveal timers
  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  // Synchronize screen layout strictly based on server-authoritative gameState status
  useEffect(() => {
    if (!user) {
      setActiveScreen('auth');
      return;
    }
    if (!gameState) {
      setActiveScreen('home');
      return;
    }

    const status = gameState.status;
    if (status === 'lobby') {
      setActiveScreen('lobby');
    } else if (status === 'tournament_bracket') {
      setActiveScreen('tournament_bracket');
    } else if (status === 'tournament_finished') {
      setActiveScreen('tournament_bracket');
    } else if (status === 'playing' || status === 'innings_break' || status === 'finished') {
      setActiveScreen('match');
    }
  }, [gameState?.status, user]);

  // Socket Connection Management
  useEffect(() => {
    if (!token || !user) return;

    // Create Socket Instance
    const socketInstance = io(SOCKET_URL, {
      auth: {
        token,
        avatar: user.avatar
      },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected successfully');
      setSystemError(null);
      sound.startAmbience();
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setSystemError('Connection error. Server is starting up or unreachable.');
    });

    // Lobby Events
    socketInstance.on('roomCreated', (data) => {
      setRoomCode(data.roomCode);
      setPlayers([data.player]);
      setSettings(data.gameState.settings);
      setGameState(data.gameState);
    });

    socketInstance.on('roomJoined', (data) => {
      setRoomCode(data.roomCode);
      setPlayers(data.players);
      setSettings(data.settings);
      setGameState(data.gameState);
      sound.playClick();
    });

    socketInstance.on('roomStateUpdate', (data) => {
      if (data.players) setPlayers(data.players);
      if (data.gameState) setGameState(data.gameState);
    });

    socketInstance.on('matchStarted', (data) => {
      setGameState(data.gameState);
      setShowConfetti(false);
      sound.playClick();
    });

    // Score / Move Update (Waiting state)
    socketInstance.on('choiceUpdate', (data) => {
      setGameState(data.gameState);
    });

    // Ball Reveal Sequence
    socketInstance.on('ballResult', ({ ballData, gameState: nextState }) => {
      const { batterVal, bowlerVal, isWicket, runsScored, commentary } = ballData;

      // Start the 3, 2, 1 Countdown Sequence
      setRevealSequence({
        isRevealing: true,
        step: '3',
        batterVal: null,
        bowlerVal: null,
        isWicket: null,
        runsScored: null,
        commentary: null,
      });
      sound.playClick();

      // Tick 2
      setTimeout(() => {
        setRevealSequence(prev => ({ ...prev, step: '2' }));
        sound.playClick();
      }, 1000);

      // Tick 1
      setTimeout(() => {
        setRevealSequence(prev => ({ ...prev, step: '1' }));
        sound.playClick();
      }, 2000);

      // Reveal Results
      setTimeout(() => {
        setRevealSequence({
          isRevealing: true,
          step: 'reveal',
          batterVal,
          bowlerVal,
          isWicket,
          runsScored,
          commentary
        });

        // Trigger native feedback and audio based on ball outcome
        if (isWicket) {
          sound.playWicket();
          
          setScreenShake(true);
          setTimeout(() => setScreenShake(false), 500);

          if (navigator.vibrate) {
            navigator.vibrate([150, 80, 150]);
          }
        } else {
          sound.playBatHit();
          if (runsScored === 4 || runsScored === 6) {
            setTimeout(() => {
              sound.playBoundaryCheer();
            }, 250);
          }
        }
      }, 3000);

      // Sync state and conclude reveal after 4.5 seconds
      setTimeout(() => {
        setRevealSequence(prev => ({ ...prev, isRevealing: false, step: null }));
        setGameState(nextState);
      }, 4500);
    });

    // Keep state ticking during next ball
    socketInstance.on('nextBall', (data) => {
      setGameState(data.gameState);
    });

    // Innings Break Trigger
    socketInstance.on('inningsChange', (data) => {
      setGameState(data.gameState);
      setInningsBreakMsg(data.message);
      sound.playBoundaryCheer();
      setTimeout(() => {
        setInningsBreakMsg(null);
      }, 5000);
    });

    socketInstance.on('lobbyChatReceived', (chat) => {
      setLobbyChatMessages(prev => [...prev, chat]);
    });

    // Match Finished Event
    socketInstance.on('matchFinished', (data) => {
      setGameState(data.gameState);
      
      const isWinner = data.winnerId === user.userId;
      const isDraw = data.winnerId === null;

      if (isWinner) {
        setShowConfetti(true);
        sound.playVictory();
      } else if (!isDraw) {
        sound.playDefeat();
      } else {
        sound.playVictory();
      }
    });

    // Tournament Specific events
    socketInstance.on('tournamentMatchFinished', (data) => {
      setGameState(data.gameState);
      setAnnouncement(`Match complete! Winner: ${data.finishedMatch.winnerName}`);
      setTimeout(() => setAnnouncement(null), 5000);
    });

    socketInstance.on('tournamentFinished', (data) => {
      setGameState(data.gameState);
      setAnnouncement(`Tournament Complete! Champion: ${data.winnerName}`);
      setShowConfetti(true);
      sound.playVictory();
      setTimeout(() => setAnnouncement(null), 8000);
    });

    socketInstance.on('playerDisconnected', (data) => {
      setAnnouncement(`${data.username} disconnected! Waiting for them to reconnect...`);
      setTimeout(() => setAnnouncement(null), 5000);
    });

    socketInstance.on('playerReconnected', (data) => {
      setGameState(data.gameState);
      setAnnouncement(`${data.username} has reconnected!`);
      setTimeout(() => setAnnouncement(null), 5000);
    });

    socketInstance.on('roomClosed', (data) => {
      setRoomCode(null);
      setPlayers([]);
      setSettings(null);
      setGameState(null);
      setLobbyChatMessages([]);
      setActiveScreen('home');
      setSystemError(data.message || 'Lobby closed by host.');
    });

    socketInstance.on('errorMsg', (data) => {
      setSystemError(data.message);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      sound.stopAmbience();
    };
  }, [token, user]);

  const toggleSoundMute = () => {
    const nextMuteState = !soundMuted;
    sound.setMute(nextMuteState);
    setSoundMuted(nextMuteState);
  };

  // Actions
  const createRoom = (overs: number, wickets: number, vsBot = false, roomType: 'single' | 'tournament' = 'single', teamName?: string) => {
    if (socket) {
      socket.emit('createRoom', { settings: { overs, wickets }, vsBot, roomType, teamName });
    }
  };

  const joinRoom = (code: string, teamName?: string) => {
    if (socket) {
      socket.emit('joinRoom', { roomCode: code.toUpperCase(), teamName });
    }
  };

  const toggleReady = (ready: boolean) => {
    if (socket) {
      socket.emit('playerReady', { ready });
    }
  };

  const startMatch = () => {
    if (socket) {
      socket.emit('startMatch');
    }
  };

  const chooseNumber = (num: number) => {
    if (socket) {
      socket.emit('chooseNumber', { number: num });
      sound.playClick();
    }
  };

  const startTournamentMatch = (matchId: string) => {
    if (socket) {
      socket.emit('startTournamentMatch', { matchId });
    }
  };

  const sendLobbyChatMessage = (message: string) => {
    if (socket) {
      socket.emit('sendLobbyChat', { message });
    }
  };

  const leaveRoom = () => {
    if (socket) {
      socket.emit('leaveRoom');
      socket.disconnect();
      socket.connect();
    }
    setRoomCode(null);
    setPlayers([]);
    setSettings(null);
    setGameState(null);
    setLobbyChatMessages([]);
    setActiveScreen('home');
    setShowConfetti(false);
  };

  const clearSystemError = () => {
    setSystemError(null);
  };

  return (
    <GameContext.Provider value={{
      socket,
      roomCode,
      players,
      settings,
      gameState,
      activeScreen,
      systemError,
      announcement,
      revealSequence,
      screenShake,
      showConfetti,
      inningsBreakMsg,
      soundMuted,
      toggleSoundMute,
      createRoom,
      joinRoom,
      toggleReady,
      startMatch,
      chooseNumber,
      leaveRoom,
      clearSystemError,
      startTournamentMatch,
      lobbyChatMessages,
      sendLobbyChatMessage
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
