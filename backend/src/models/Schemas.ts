import mongoose, { Schema, Document } from 'mongoose';

// User Interface & Schema
export interface IUser extends Document {
  username: string;
  passwordHash: string | null;
  isGuest: boolean;
  avatar: string;
  createdAt: Date;
}

export const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, default: null },
  isGuest: { type: Boolean, default: false },
  avatar: { type: String, default: 'avatar1' },
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model<IUser>('User', UserSchema);

// User Stats / Leaderboard Interface & Schema
export interface IUserStats extends Document {
  userId: mongoose.Types.ObjectId | string;
  username: string; // denormalized for fast queries
  matchesPlayed: number;
  wins: number;
  losses: number;
  highestScore: number;
  totalRuns: number;
  ballsFaced: number;
  wicketsTaken: number;
  winningStreak: number;
  currentStreak: number;
}

export const UserStatsSchema = new Schema<IUserStats>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  username: { type: String, required: true },
  matchesPlayed: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  highestScore: { type: Number, default: 0 },
  totalRuns: { type: Number, default: 0 },
  ballsFaced: { type: Number, default: 0 },
  wicketsTaken: { type: Number, default: 0 },
  winningStreak: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
});

export const UserStats = mongoose.model<IUserStats>('UserStats', UserStatsSchema);

// Match History Interface & Schema
export interface IPlayerSummary {
  userId: string;
  username: string;
  role: 'bat' | 'bowl';
  score: number;
  wickets: number;
  avatar: string;
  teamName?: string;
}

export interface IInningsBall {
  ballIndex: number;
  batterVal: number;
  bowlerVal: number;
  result: 'runs' | 'out' | 'timeout';
  runsScored: number;
  commentary: string;
}

export interface IInningsSummary {
  inningsNum: number;
  battingUser: string;
  bowlingUser: string;
  score: number;
  wickets: number;
  balls: number;
  overs: number;
  ballsHistory: IInningsBall[];
}

export interface IMatchHistory extends Document {
  roomCode: string;
  players: IPlayerSummary[];
  overs: number;
  wickets: number;
  winnerId: string | null;
  winnerName: string; // 'Draw' or username
  innings: IInningsSummary[];
  createdAt: Date;
  roomType?: 'single' | 'tournament';
}

const PlayerSummarySchema = new Schema<IPlayerSummary>({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  role: { type: String, enum: ['bat', 'bowl'], required: true },
  score: { type: Number, required: true },
  wickets: { type: Number, required: true },
  avatar: { type: String, default: 'avatar1' },
  teamName: { type: String, default: '' },
});

const InningsBallSchema = new Schema<IInningsBall>({
  ballIndex: { type: Number, required: true },
  batterVal: { type: Number, required: true },
  bowlerVal: { type: Number, required: true },
  result: { type: String, enum: ['runs', 'out', 'timeout'], required: true },
  runsScored: { type: Number, default: 0 },
  commentary: { type: String, default: '' },
});

const InningsSummarySchema = new Schema<IInningsSummary>({
  inningsNum: { type: Number, required: true },
  battingUser: { type: String, required: true },
  bowlingUser: { type: String, required: true },
  score: { type: Number, required: true },
  wickets: { type: Number, required: true },
  balls: { type: Number, required: true },
  overs: { type: Number, required: true },
  ballsHistory: [InningsBallSchema],
});

export const MatchHistorySchema = new Schema<IMatchHistory>({
  roomCode: { type: String, required: true },
  players: [PlayerSummarySchema],
  overs: { type: Number, required: true },
  wickets: { type: Number, required: true },
  winnerId: { type: String, default: null },
  winnerName: { type: String, required: true },
  innings: [InningsSummarySchema],
  createdAt: { type: Date, default: Date.now },
  roomType: { type: String, enum: ['single', 'tournament'], default: 'single' },
});

export const MatchHistory = mongoose.model<IMatchHistory>('MatchHistory', MatchHistorySchema);

// In-Memory Database Fallback Store (for when MongoDB connection is unavailable)
class InMemoryDatabase {
  users: any[] = [];
  stats: any[] = [];
  matchHistories: any[] = [];

  constructor() {
    console.log('In-Memory Database initialized for local resilience.');
  }

  // Users
  async findUserById(id: string) {
    return this.users.find(u => u._id === id || u.id === id) || null;
  }

  async findUserByUsername(username: string) {
    return this.users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  async createUser(userObj: any) {
    const newUser = {
      _id: new mongoose.Types.ObjectId().toString(),
      createdAt: new Date(),
      ...userObj
    };
    this.users.push(newUser);
    // Initialize stats
    await this.createStats({
      userId: newUser._id,
      username: newUser.username,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      highestScore: 0,
      totalRuns: 0,
      ballsFaced: 0,
      wicketsTaken: 0,
      winningStreak: 0,
      currentStreak: 0
    });
    return newUser;
  }

  // Stats
  async findStatsByUserId(userId: string) {
    let stat = this.stats.find(s => s.userId === userId);
    if (!stat) {
      const user = await this.findUserById(userId);
      if (user) {
        stat = await this.createStats({
          userId: user._id,
          username: user.username,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          highestScore: 0,
          totalRuns: 0,
          ballsFaced: 0,
          wicketsTaken: 0,
          winningStreak: 0,
          currentStreak: 0
        });
      }
    }
    return stat || null;
  }

  async createStats(statsObj: any) {
    const newStats = {
      _id: new mongoose.Types.ObjectId().toString(),
      ...statsObj
    };
    this.stats.push(newStats);
    return newStats;
  }

  async getAllStats() {
    return [...this.stats];
  }

  // Match History
  async createMatchHistory(historyObj: any) {
    const newHistory = {
      _id: new mongoose.Types.ObjectId().toString(),
      createdAt: new Date(),
      ...historyObj
    };
    this.matchHistories.push(newHistory);
    
    // Update player stats in-memory
    for (const player of historyObj.players) {
      const stat = await this.findStatsByUserId(player.userId);
      if (stat) {
        stat.matchesPlayed += 1;
        stat.totalRuns += player.role === 'bat' ? player.score : 0;
        if (player.role === 'bat' && player.score > stat.highestScore) {
          stat.highestScore = player.score;
        }
        
        const isWinner = historyObj.winnerId === player.userId;
        const isDraw = historyObj.winnerId === null;
        
        if (isWinner) {
          stat.wins += 1;
          stat.currentStreak += 1;
          if (stat.currentStreak > stat.winningStreak) {
            stat.winningStreak = stat.currentStreak;
          }
        } else if (!isDraw) {
          stat.losses += 1;
          stat.currentStreak = 0;
        }

        // Count balls faced and wickets taken
        let ballsF = 0;
        let wixT = 0;
        for (const inn of historyObj.innings) {
          if (inn.battingUser === player.username) {
            ballsF += inn.balls;
          }
          if (inn.bowlingUser === player.username) {
            wixT += inn.wickets;
          }
        }
        stat.ballsFaced += ballsF;
        stat.wicketsTaken += wixT;
      }
    }

    return newHistory;
  }

  async getMatchHistoryForUser(username: string) {
    return this.matchHistories.filter(m => 
      m.players.some((p: any) => p.username.toLowerCase() === username.toLowerCase())
    ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export const dbFallback = new InMemoryDatabase();
export let isMongoConnected = false;

export function setMongoConnected(status: boolean) {
  isMongoConnected = status;
}
