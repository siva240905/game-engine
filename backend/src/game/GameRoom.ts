import { dbFallback, isMongoConnected, UserStats, MatchHistory } from '../models/Schemas';

export interface IPlayer {
  socketId: string;
  userId: string;
  username: string;
  avatar: string;
  ready: boolean;
  role: 'bat' | 'bowl' | 'idle';
  score: number;
  wickets: number;
  choice: number | null; // 1-6
  isDisconnected: boolean;
  disconnectTime?: number;
  isBot?: boolean;
  teamName?: string;
}

export interface IRoomSettings {
  overs: number; // 1, 2, 5, or 10
  wickets: number; // 1, 2, 5, or 10
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

export class GameRoom {
  roomCode: string;
  players: IPlayer[] = [];
  settings: IRoomSettings;
  status: 'lobby' | 'playing' | 'innings_break' | 'finished' | 'tournament_bracket' | 'tournament_finished' = 'lobby';
  isBotRoom: boolean = false;
  roomType: 'single' | 'tournament' = 'single';
  
  // Game state
  currentInnings: 1 | 2 = 1;
  target: number | null = null; // target for 2nd innings (Score of 1st innings + 1)
  
  // Current Innings Stats
  inningsScore: number = 0;
  inningsWickets: number = 0;
  inningsBalls: number = 0;
  recentBalls: string[] = []; // string representations e.g. "4", "W", "2", "6"
  
  // Game logs for database saving
  inningsHistory: any[] = [];
  currentInningsBalls: any[] = [];
  
  // Timer attributes
  timerValue: number = 10;
  timerInterval: NodeJS.Timeout | null = null;
  io: any; // Socket.io server instance for broadcasting
  
  // Active Batter / Bowler references
  batterId: string = '';
  bowlerId: string = '';

  // Tournament variables
  tournamentBracket: ITournamentMatch[] = [];
  currentMatchId: string | null = null;
  tournamentWinnerName: string = '';

  constructor(roomCode: string, settings: IRoomSettings, io: any, isBotRoom: boolean = false, roomType: 'single' | 'tournament' = 'single') {
    this.roomCode = roomCode;
    this.settings = settings;
    this.io = io;
    this.isBotRoom = isBotRoom;
    this.roomType = roomType;
  }

  addPlayer(socketId: string, userId: string, username: string, avatar: string, teamName?: string): IPlayer {
    // If player already in room (reconnection)
    const existing = this.players.find(p => p.userId === userId);
    if (existing) {
      existing.socketId = socketId;
      existing.isDisconnected = false;
      if (teamName) existing.teamName = teamName;
      return existing;
    }

    const role = 'idle';
    const newPlayer: IPlayer = {
      socketId,
      userId,
      username,
      avatar,
      ready: false,
      role,
      score: 0,
      wickets: 0,
      choice: null,
      isDisconnected: false,
      teamName: teamName || `${username} XI`
    };
    this.players.push(newPlayer);

    // If it is a vs Bot room, immediately append the Bot
    if (this.isBotRoom && this.players.length === 1) {
      const botPlayer: IPlayer = {
        socketId: 'bot-socket',
        userId: 'bot-user',
        username: '🤖 Engine Bot',
        avatar: 'avatar3',
        ready: true, // bot is always ready
        role: 'idle',
        score: 0,
        wickets: 0,
        choice: null,
        isDisconnected: false,
        isBot: true,
        teamName: 'Bot Super Kings'
      };
      this.players.push(botPlayer);
    }

    return newPlayer;
  }

  removePlayer(socketId: string): boolean {
    const playerIndex = this.players.findIndex(p => p.socketId === socketId);
    if (playerIndex !== -1) {
      const player = this.players[playerIndex];
      if (this.status === 'lobby' || this.status === 'tournament_bracket' || this.status === 'tournament_finished') {
        const isHost = playerIndex === 0;
        this.players.splice(playerIndex, 1);
        return isHost || this.players.length === 0;
      } else {
        // Flag as disconnected in mid-game so they can reconnect
        player.isDisconnected = true;
        player.disconnectTime = Date.now();
        return false; // don't delete room yet
      }
    }
    return false;
  }

  setReady(userId: string, ready: boolean) {
    const player = this.players.find(p => p.userId === userId);
    if (player) {
      player.ready = ready;
    }
  }

  allReady(): boolean {
    if (this.roomType === 'tournament') {
      return this.players.length >= 3 && this.players.every(p => p.ready);
    }
    return this.players.length === 2 && this.players.every(p => p.ready);
  }

  startMatch() {
    this.status = 'playing';
    this.currentInnings = 1;
    this.inningsScore = 0;
    this.inningsWickets = 0;
    this.inningsBalls = 0;
    this.recentBalls = [];
    this.inningsHistory = [];
    this.currentInningsBalls = [];
    
    // Assign roles randomly
    const idx = Math.random() < 0.5 ? 0 : 1;
    this.players[idx].role = 'bat';
    this.players[1 - idx].role = 'bowl';
    
    this.batterId = this.players[idx].userId;
    this.bowlerId = this.players[1 - idx].userId;

    this.players[0].score = 0;
    this.players[0].wickets = 0;
    this.players[1].score = 0;
    this.players[1].wickets = 0;

    this.startBallTimer();
  }

  // --- IPL Tournament Engine ---

  startTournament() {
    this.status = 'tournament_bracket';
    this.generateTournamentBracket();
  }

  mapPlayerForBracket(p: IPlayer) {
    return {
      userId: p.userId,
      username: p.username,
      teamName: p.teamName || `${p.username} XI`,
      avatar: p.avatar
    };
  }

  generateTournamentBracket() {
    const shuffled = [...this.players].sort(() => Math.random() - 0.5);
    const n = shuffled.length;

    // Initialize root nodes
    const finalMatch: ITournamentMatch = {
      id: 'f1',
      player1: null,
      player2: null,
      score1: 0,
      score2: 0,
      winnerId: null,
      winnerName: '',
      status: 'pending',
      round: 'Final',
      nextMatchId: null
    };

    const semi1: ITournamentMatch = {
      id: 's1',
      player1: null,
      player2: null,
      score1: 0,
      score2: 0,
      winnerId: null,
      winnerName: '',
      status: 'pending',
      round: 'Semis',
      nextMatchId: 'f1'
    };

    const semi2: ITournamentMatch = {
      id: 's2',
      player1: null,
      player2: null,
      score1: 0,
      score2: 0,
      winnerId: null,
      winnerName: '',
      status: 'pending',
      round: 'Semis',
      nextMatchId: 'f1'
    };

    const quarters: ITournamentMatch[] = [];
    for (let i = 1; i <= 4; i++) {
      quarters.push({
        id: `q${i}`,
        player1: null,
        player2: null,
        score1: 0,
        score2: 0,
        winnerId: null,
        winnerName: '',
        status: 'pending',
        round: 'Quarters',
        nextMatchId: i <= 2 ? 's1' : 's2'
      });
    }

    // Dynamic bracket mapping based on size
    if (n <= 2) {
      this.tournamentBracket = [finalMatch];
      finalMatch.player1 = this.mapPlayerForBracket(shuffled[0]);
      finalMatch.player2 = shuffled[1] ? this.mapPlayerForBracket(shuffled[1]) : null;
    } else if (n <= 4) {
      this.tournamentBracket = [semi1, semi2, finalMatch];
      semi1.player1 = this.mapPlayerForBracket(shuffled[0]);
      semi1.player2 = shuffled[1] ? this.mapPlayerForBracket(shuffled[1]) : null;
      semi2.player1 = shuffled[2] ? this.mapPlayerForBracket(shuffled[2]) : null;
      semi2.player2 = shuffled[3] ? this.mapPlayerForBracket(shuffled[3]) : null;

      // check byes
      if (!semi1.player2) this.advanceByeWinner('s1', semi1.player1!);
      if (!semi2.player2 && semi2.player1) this.advanceByeWinner('s2', semi2.player1!);
    } else {
      // 5 to 10 players -> Quarters setup
      this.tournamentBracket = [...quarters, semi1, semi2, finalMatch];

      // Seed Quarters deterministically
      if (n === 5) {
        quarters[0].player1 = this.mapPlayerForBracket(shuffled[0]);
        quarters[0].player2 = this.mapPlayerForBracket(shuffled[1]);
        quarters[1].player1 = this.mapPlayerForBracket(shuffled[2]);
        quarters[1].player2 = this.mapPlayerForBracket(shuffled[3]);
        quarters[2].player1 = this.mapPlayerForBracket(shuffled[4]);
        this.advanceByeWinner('q2', quarters[1].player1!); // simulate bye Q3
        this.advanceByeWinner('q3', quarters[2].player1!);
        this.advanceByeWinner('q4', { userId: 'bye', username: 'Bye', teamName: 'Bye' });
      } else if (n === 6) {
        quarters[0].player1 = this.mapPlayerForBracket(shuffled[0]);
        quarters[0].player2 = this.mapPlayerForBracket(shuffled[1]);
        quarters[1].player1 = this.mapPlayerForBracket(shuffled[2]);
        quarters[1].player2 = this.mapPlayerForBracket(shuffled[3]);
        quarters[2].player1 = this.mapPlayerForBracket(shuffled[4]);
        quarters[2].player2 = this.mapPlayerForBracket(shuffled[5]);
        this.advanceByeWinner('q4', { userId: 'bye', username: 'Bye', teamName: 'Bye' });
      } else if (n === 7) {
        quarters[0].player1 = this.mapPlayerForBracket(shuffled[0]);
        quarters[0].player2 = this.mapPlayerForBracket(shuffled[1]);
        quarters[1].player1 = this.mapPlayerForBracket(shuffled[2]);
        quarters[1].player2 = this.mapPlayerForBracket(shuffled[3]);
        quarters[2].player1 = this.mapPlayerForBracket(shuffled[4]);
        quarters[2].player2 = this.mapPlayerForBracket(shuffled[5]);
        quarters[3].player1 = this.mapPlayerForBracket(shuffled[6]);
        this.advanceByeWinner('q4', quarters[3].player1!);
      } else if (n === 8) {
        for (let i = 0; i < 4; i++) {
          quarters[i].player1 = this.mapPlayerForBracket(shuffled[i * 2]);
          quarters[i].player2 = this.mapPlayerForBracket(shuffled[i * 2 + 1]);
        }
      } else {
        // 9 or 10 players -> Round 1 preliminaries
        const r1Match: ITournamentMatch = {
          id: 'r1',
          player1: this.mapPlayerForBracket(shuffled[8]),
          player2: shuffled[9] ? this.mapPlayerForBracket(shuffled[9]) : null,
          score1: 0,
          score2: 0,
          winnerId: null,
          winnerName: '',
          status: 'pending',
          round: 'Round1',
          nextMatchId: 'q4'
        };

        this.tournamentBracket.unshift(r1Match);

        // Seed Quarters (1-8)
        for (let i = 0; i < 4; i++) {
          quarters[i].player1 = this.mapPlayerForBracket(shuffled[i * 2]);
          if (i !== 3) {
            quarters[i].player2 = this.mapPlayerForBracket(shuffled[i * 2 + 1]);
          } else {
            quarters[3].player2 = null; // Winner of R1 goes here
          }
        }

        if (!r1Match.player2) {
          // 9 players bye
          this.advanceByeWinner('r1', r1Match.player1!);
        }
      }
    }
  }

  advanceByeWinner(matchId: string, player: any) {
    const match = this.tournamentBracket.find(m => m.id === matchId);
    if (match) {
      match.winnerId = player.userId;
      match.winnerName = player.username;
      match.status = 'bye';
      if (match.nextMatchId) {
        this.propagateWinner(match.nextMatchId, player);
      }
    }
  }

  propagateWinner(nextId: string, player: any) {
    const nextMatch = this.tournamentBracket.find(m => m.id === nextId);
    if (nextMatch) {
      if (!nextMatch.player1) {
        nextMatch.player1 = player;
      } else if (!nextMatch.player2) {
        nextMatch.player2 = player;
      }
    }
  }

  startTournamentMatch(matchId: string) {
    const match = this.tournamentBracket.find(m => m.id === matchId);
    if (!match || !match.player1 || !match.player2) return;

    this.currentMatchId = matchId;
    match.status = 'playing';
    this.status = 'playing';

    this.currentInnings = 1;
    this.inningsScore = 0;
    this.inningsWickets = 0;
    this.inningsBalls = 0;
    this.recentBalls = [];
    this.inningsHistory = [];
    this.currentInningsBalls = [];

    this.batterId = match.player1.userId;
    this.bowlerId = match.player2.userId;

    // Reset player specific details
    this.players.forEach(p => {
      p.score = 0;
      p.wickets = 0;
      p.choice = null;
      if (p.userId === this.batterId) {
        p.role = 'bat';
      } else if (p.userId === this.bowlerId) {
        p.role = 'bowl';
      } else {
        p.role = 'idle'; // Specating
      }
    });

    this.startBallTimer();
  }

  // --- Engine updates ---

  submitChoice(userId: string, choice: number) {
    if (this.status !== 'playing') return;
    const player = this.players.find(p => p.userId === userId);
    if (player && player.choice === null) {
      player.choice = choice;

      // If vsBot is enabled, immediately make the bot make a choice
      if (this.isBotRoom) {
        const botPlayer = this.players.find(p => p.isBot);
        if (botPlayer && botPlayer.choice === null) {
          botPlayer.choice = this.calculateBotChoice(botPlayer, player);
        }
      }
      
      // If both active match players have made their choice
      const activeMatch = this.roomType === 'tournament' 
        ? this.tournamentBracket.find(m => m.id === this.currentMatchId)
        : null;

      const p1ChoiceDone = activeMatch ? this.players.find(p => p.userId === activeMatch.player1?.userId)?.choice !== null : true;
      const p2ChoiceDone = activeMatch ? this.players.find(p => p.userId === activeMatch.player2?.userId)?.choice !== null : true;

      const singleChoiceDone = this.roomType === 'single' && this.players.every(p => p.choice !== null);

      if (singleChoiceDone || (this.roomType === 'tournament' && p1ChoiceDone && p2ChoiceDone)) {
        this.evaluateBall();
      }
    }
  }

  calculateBotChoice(bot: IPlayer, opponent: IPlayer): number {
    if (bot.role === 'bat') {
      const rand = Math.random();
      if (rand < 0.25) return 4;
      if (rand < 0.50) return 6;
      if (rand < 0.70) return 3;
      if (rand < 0.85) return 2;
      if (rand < 0.95) return 1;
      return 5;
    }
    const rand = Math.random();
    if (rand < 0.22) {
      return opponent.choice || Math.floor(Math.random() * 6) + 1;
    }
    return Math.floor(Math.random() * 6) + 1;
  }

  startBallTimer() {
    this.clearTimer();
    this.timerValue = 10;
    
    // Broadcast countdown updates
    this.io.to(this.roomCode).emit('timerTick', { seconds: this.timerValue });

    this.timerInterval = setInterval(() => {
      this.timerValue--;
      this.io.to(this.roomCode).emit('timerTick', { seconds: this.timerValue });

      if (this.timerValue <= 0) {
        this.clearTimer();
        this.handleTimeout();
      }
    }, 1000);
  }

  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  handleTimeout() {
    // If an active player hasn't chosen, assign them a random choice
    if (this.roomType === 'tournament') {
      const match = this.tournamentBracket.find(m => m.id === this.currentMatchId)!;
      const p1 = this.players.find(p => p.userId === match.player1?.userId)!;
      const p2 = this.players.find(p => p.userId === match.player2?.userId)!;
      if (p1.choice === null) p1.choice = Math.floor(Math.random() * 6) + 1;
      if (p2.choice === null) p2.choice = Math.floor(Math.random() * 6) + 1;
    } else {
      this.players.forEach(p => {
        if (p.choice === null) {
          p.choice = Math.floor(Math.random() * 6) + 1;
        }
      });
    }

    this.evaluateBall();
  }

  getCommentary(runs: number, isWicket: boolean, batterName: string): string {
    if (isWicket) {
      const commentaries = [
        `OUT! Perfect prediction by the bowler!`,
        `OUT! Clean bowled! Flying stumps everywhere!`,
        `OUT! A loose shot, and the bowler strikes!`,
        `OUT! Magnificent catch! The batter has to walk.`,
        `OUT! Straight into the hands of the fielder!`
      ];
      return commentaries[Math.floor(Math.random() * commentaries.length)];
    }
    
    if (runs === 6) {
      return `Huge six! ${batterName} sends it out of the stadium!`;
    }
    if (runs === 4) {
      return `Beautiful shot! Pierces the gap for a boundary!`;
    }
    if (runs === 5) {
      return `An unusual 5 runs! Aggressive batting!`;
    }
    if (runs === 3) {
      return `Superb running! They complete a quick three!`;
    }
    if (runs === 2) {
      return `Pushed into the gap for a couple.`;
    }
    
    const general = [
      `Bowler misses! Batter plays it safe.`,
      `Just a single. Rotates the strike.`,
      `Well played for one run.`,
      `Target getting closer!`
    ];
    return general[Math.floor(Math.random() * general.length)];
  }

  evaluateBall() {
    this.clearTimer();

    const batter = this.players.find(p => p.userId === this.batterId)!;
    const bowler = this.players.find(p => p.userId === this.bowlerId)!;

    const batVal = batter.choice!;
    const bowlVal = bowler.choice!;

    // Reset choices
    this.players.forEach(p => p.choice = null);

    const isWicket = batVal === bowlVal;
    let runsScored = 0;
    let resultType: 'runs' | 'out' = 'runs';

    if (isWicket) {
      resultType = 'out';
      this.inningsWickets++;
      bowler.wickets++;
      this.recentBalls.push('W');
    } else {
      runsScored = batVal;
      this.inningsScore += runsScored;
      batter.score += runsScored;
      this.recentBalls.push(runsScored.toString());
    }

    this.inningsBalls++;
    if (this.recentBalls.length > 6) {
      this.recentBalls.shift();
    }

    const commentary = this.getCommentary(runsScored, isWicket, batter.username);

    this.currentInningsBalls.push({
      ballIndex: this.inningsBalls,
      batterVal: batVal,
      bowlerVal: bowlVal,
      result: resultType,
      runsScored,
      commentary,
    });

    const ballData = {
      batterVal: batVal,
      bowlerVal: bowlVal,
      isWicket,
      runsScored,
      commentary,
      recentBalls: [...this.recentBalls]
    };

    this.io.to(this.roomCode).emit('ballResult', {
      ballData,
      gameState: this.getGameState()
    });

    setTimeout(() => {
      this.checkInningsStatus();
    }, 4500);
  }

  checkInningsStatus() {
    if (this.status !== 'playing') return;

    const maxBalls = this.settings.overs * 6;
    const maxWickets = this.settings.wickets;

    if (this.currentInnings === 1) {
      if (this.inningsWickets >= maxWickets || this.inningsBalls >= maxBalls) {
        this.transitionToSecondInnings();
      } else {
        this.startBallTimer();
        this.io.to(this.roomCode).emit('nextBall', { gameState: this.getGameState() });
      }
    } else {
      const hasChased = this.inningsScore >= this.target!;
      const allOutOrOvers = this.inningsWickets >= maxWickets || this.inningsBalls >= maxBalls;

      if (hasChased || allOutOrOvers) {
        this.finishMatch();
      } else {
        this.startBallTimer();
        this.io.to(this.roomCode).emit('nextBall', { gameState: this.getGameState() });
      }
    }
  }

  transitionToSecondInnings() {
    const batter = this.players.find(p => p.userId === this.batterId)!;
    const bowler = this.players.find(p => p.userId === this.bowlerId)!;

    this.inningsHistory.push({
      inningsNum: 1,
      battingUser: batter.username,
      bowlingUser: bowler.username,
      score: this.inningsScore,
      wickets: this.inningsWickets,
      balls: this.inningsBalls,
      overs: this.settings.overs,
      ballsHistory: [...this.currentInningsBalls],
    });

    this.status = 'innings_break';
    this.currentInnings = 2;
    this.target = this.inningsScore + 1;
    
    this.inningsScore = 0;
    this.inningsWickets = 0;
    this.inningsBalls = 0;
    this.recentBalls = [];
    this.currentInningsBalls = [];

    const oldBatterId = this.batterId;
    this.batterId = this.bowlerId;
    this.bowlerId = oldBatterId;

    this.players.forEach(p => {
      if (p.userId === this.batterId) {
        p.role = 'bat';
      } else if (p.userId === this.bowlerId) {
        p.role = 'bowl';
      } else {
        p.role = 'idle';
      }
    });

    this.io.to(this.roomCode).emit('inningsChange', {
      message: `Innings 1 Complete! Target: ${this.target} runs. Roles swapped!`,
      gameState: this.getGameState(),
    });

    setTimeout(() => {
      if (this.status === 'innings_break') {
        this.status = 'playing';
        this.startBallTimer();
        this.io.to(this.roomCode).emit('nextBall', { gameState: this.getGameState() });
      }
    }, 5000);
  }

  async finishMatch() {
    this.clearTimer();

    const batter = this.players.find(p => p.userId === this.batterId)!;
    const bowler = this.players.find(p => p.userId === this.bowlerId)!;

    this.inningsHistory.push({
      inningsNum: 2,
      battingUser: batter.username,
      bowlingUser: bowler.username,
      score: this.inningsScore,
      wickets: this.inningsWickets,
      balls: this.inningsBalls,
      overs: this.settings.overs,
      ballsHistory: [...this.currentInningsBalls],
    });

    let winnerId: string | null = null;
    let winnerName = 'Draw';
    const secondInnings = this.inningsHistory[1];

    if (secondInnings.score >= this.target!) {
      winnerId = batter.userId;
      winnerName = batter.username;
    } else if (secondInnings.score < this.target! - 1) {
      winnerId = bowler.userId;
      winnerName = bowler.username;
    } else {
      // In case of a draw in tournament knockout, advance the batter (team 1 / batter of second innings) to avoid lock
      winnerId = batter.userId;
      winnerName = batter.username;
    }

    const matchData = {
      roomCode: this.roomCode,
      players: this.players.filter(p => p.userId === batter.userId || p.userId === bowler.userId).map(p => ({
        userId: p.userId,
        username: p.username,
        role: p.role as 'bat' | 'bowl',
        score: p.score,
        wickets: p.wickets,
        avatar: p.avatar,
        teamName: p.teamName
      })),
      overs: this.settings.overs,
      wickets: this.settings.wickets,
      winnerId,
      winnerName,
      innings: this.inningsHistory,
      roomType: this.roomType
    };

    try {
      if (isMongoConnected) {
        const record = new MatchHistory(matchData);
        await record.save();

        // Update stats
        for (const p of this.players) {
          if (p.userId !== batter.userId && p.userId !== bowler.userId) continue;
          const stats = await UserStats.findOne({ userId: p.userId });
          if (stats) {
            stats.matchesPlayed += 1;
            stats.totalRuns += p.role === 'bat' ? p.score : 0;
            if (p.role === 'bat' && p.score > stats.highestScore) {
              stats.highestScore = p.score;
            }
            const isWinner = winnerId === p.userId;
            if (isWinner) {
              stats.wins += 1;
              stats.currentStreak += 1;
              if (stats.currentStreak > stats.winningStreak) stats.winningStreak = stats.currentStreak;
            } else {
              stats.losses += 1;
              stats.currentStreak = 0;
            }
            await stats.save();
          }
        }
      } else {
        await dbFallback.createMatchHistory(matchData);
      }
    } catch (err) {
      console.error('Error saving match summary to database: ', err);
      await dbFallback.createMatchHistory(matchData);
    }

    if (this.roomType === 'tournament') {
      // Tournament progression
      const bracketMatch = this.tournamentBracket.find(m => m.id === this.currentMatchId)!;
      bracketMatch.winnerId = winnerId;
      bracketMatch.winnerName = winnerName;
      bracketMatch.status = 'completed';
      bracketMatch.score1 = matchData.players[0].userId === bracketMatch.player1?.userId ? matchData.players[0].score : matchData.players[1].score;
      bracketMatch.score2 = matchData.players[0].userId === bracketMatch.player2?.userId ? matchData.players[0].score : matchData.players[1].score;

      const winnerPlayer = this.players.find(p => p.userId === winnerId)!;
      const winnerMapped = this.mapPlayerForBracket(winnerPlayer);

      if (bracketMatch.nextMatchId) {
        this.propagateWinner(bracketMatch.nextMatchId, winnerMapped);
        this.status = 'tournament_bracket'; // Back to bracket view
        this.currentMatchId = null;

        this.io.to(this.roomCode).emit('tournamentMatchFinished', {
          finishedMatch: bracketMatch,
          gameState: this.getGameState()
        });
      } else {
        // Final complete
        this.status = 'tournament_finished';
        this.tournamentWinnerName = winnerName;

        this.io.to(this.roomCode).emit('tournamentFinished', {
          winnerName,
          gameState: this.getGameState()
        });
      }
    } else {
      this.status = 'finished';
      this.io.to(this.roomCode).emit('matchFinished', {
        winnerId,
        winnerName,
        gameState: this.getGameState()
      });
    }
  }

  getGameState() {
    const batter = this.players.find(p => p.userId === this.batterId);
    const bowler = this.players.find(p => p.userId === this.bowlerId);

    const overNumber = Math.floor(this.inningsBalls / 6);
    const ballNumber = this.inningsBalls % 6;

    const totalOversDone = (this.inningsBalls / 6);
    const crr = totalOversDone > 0 ? Number((this.inningsScore / totalOversDone).toFixed(2)) : 0;

    let rrr = 0;
    if (this.currentInnings === 2 && this.target !== null) {
      const ballsLeft = (this.settings.overs * 6) - this.inningsBalls;
      const runsNeeded = this.target - this.inningsScore;
      if (ballsLeft > 0 && runsNeeded > 0) {
        rrr = Number(((runsNeeded / ballsLeft) * 6).toFixed(2));
      } else if (runsNeeded <= 0) {
        rrr = 0;
      } else {
        rrr = 999;
      }
    }

    return {
      roomCode: this.roomCode,
      status: this.status,
      roomType: this.roomType,
      currentInnings: this.currentInnings,
      target: this.target,
      inningsScore: this.inningsScore,
      inningsWickets: this.inningsWickets,
      inningsBalls: this.inningsBalls,
      overNumber,
      ballNumber,
      crr,
      rrr,
      recentBalls: this.recentBalls,
      settings: this.settings,
      batter: batter ? { userId: batter.userId, username: batter.username, avatar: batter.avatar, score: batter.score, choiceMade: batter.choice !== null, teamName: batter.teamName } : null,
      bowler: bowler ? { userId: bowler.userId, username: bowler.username, avatar: bowler.avatar, wickets: bowler.wickets, choiceMade: bowler.choice !== null, teamName: bowler.teamName } : null,
      players: this.players.map(p => ({
        userId: p.userId,
        username: p.username,
        avatar: p.avatar,
        ready: p.ready,
        role: p.role,
        isDisconnected: p.isDisconnected,
        teamName: p.teamName
      })),
      timerValue: this.timerValue,
      tournamentBracket: this.tournamentBracket,
      currentMatchId: this.currentMatchId,
      tournamentWinnerName: this.tournamentWinnerName
    };
  }
}
