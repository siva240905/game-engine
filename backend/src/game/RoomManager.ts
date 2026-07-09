import { GameRoom, IRoomSettings } from './GameRoom';

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, GameRoom> = new Map();

  private constructor() {}

  static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  createRoom(settings: IRoomSettings, io: any, isBotRoom = false, roomType: 'single' | 'tournament' = 'single'): GameRoom {
    let roomCode = this.generateRoomCode();
    // Ensure uniqueness
    while (this.rooms.has(roomCode)) {
      roomCode = this.generateRoomCode();
    }

    const room = new GameRoom(roomCode, settings, io, isBotRoom, roomType);
    this.rooms.set(roomCode, room);
    return room;
  }

  getRoom(roomCode: string): GameRoom | undefined {
    return this.rooms.get(roomCode.toUpperCase());
  }

  deleteRoom(roomCode: string): boolean {
    const ucCode = roomCode.toUpperCase();
    const room = this.rooms.get(ucCode);
    if (room) {
      room.clearTimer();
      this.rooms.delete(ucCode);
      return true;
    }
    return false;
  }

  findRoomBySocketId(socketId: string): GameRoom | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some(p => p.socketId === socketId)) {
        return room;
      }
    }
    return undefined;
  }

  findRoomByUserId(userId: string): GameRoom | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some(p => p.userId === userId)) {
        return room;
      }
    }
    return undefined;
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
