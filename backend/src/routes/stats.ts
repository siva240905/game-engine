import { Router, Response } from 'express';
import { authenticateJWT } from './auth';
import { UserStats, MatchHistory, dbFallback, isMongoConnected } from '../models/Schemas';

const router = Router();

// Get logged-in user's stats
router.get('/my-stats', authenticateJWT, async (req: any, res: Response) => {
  const userId = req.user.userId;
  try {
    let stats;
    if (isMongoConnected) {
      stats = await UserStats.findOne({ userId });
    } else {
      stats = await dbFallback.findStatsByUserId(userId);
    }

    if (!stats) {
      return res.status(404).json({ error: 'Stats not found for user' });
    }

    // Calculate win percentage and average score on-the-fly
    const winRate = stats.matchesPlayed > 0 ? Math.round((stats.wins / stats.matchesPlayed) * 100) : 0;
    const avgScore = stats.matchesPlayed > 0 ? Math.round(stats.totalRuns / stats.matchesPlayed) : 0;

    return res.json({
      ...stats.toObject ? stats.toObject() : stats,
      winRate,
      avgScore
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user specific stats by ID
router.get('/user/:id', async (req: any, res: Response) => {
  const userId = req.params.id;
  try {
    let stats;
    if (isMongoConnected) {
      stats = await UserStats.findOne({ userId });
    } else {
      stats = await dbFallback.findStatsByUserId(userId);
    }

    if (!stats) {
      return res.status(404).json({ error: 'Stats not found' });
    }

    const winRate = stats.matchesPlayed > 0 ? Math.round((stats.wins / stats.matchesPlayed) * 100) : 0;
    const avgScore = stats.matchesPlayed > 0 ? Math.round(stats.totalRuns / stats.matchesPlayed) : 0;

    return res.json({
      ...stats.toObject ? stats.toObject() : stats,
      winRate,
      avgScore
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Leaderboard rankings
router.get('/leaderboard', async (req: any, res: Response) => {
  try {
    let allStats: any[] = [];
    if (isMongoConnected) {
      allStats = await UserStats.find({});
    } else {
      allStats = await dbFallback.getAllStats();
    }

    // Compile ranking criteria: Most Wins, Highest Score, Longest Winning Streak
    const formattedStats = allStats.map(s => {
      const statsObj = s.toObject ? s.toObject() : s;
      const winRate = statsObj.matchesPlayed > 0 ? Math.round((statsObj.wins / statsObj.matchesPlayed) * 100) : 0;
      const avgScore = statsObj.matchesPlayed > 0 ? Math.round(statsObj.totalRuns / statsObj.matchesPlayed) : 0;
      return {
        ...statsObj,
        winRate,
        avgScore
      };
    });

    // 1. Sort by Wins (Most Wins Leaderboard)
    const byWins = [...formattedStats]
      .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate)
      .slice(0, 10);

    // 2. Sort by Highest Score
    const byHighestScore = [...formattedStats]
      .sort((a, b) => b.highestScore - a.highestScore)
      .slice(0, 10);

    // 3. Sort by Longest Winning Streak
    const byStreak = [...formattedStats]
      .sort((a, b) => b.winningStreak - a.winningStreak)
      .slice(0, 10);

    return res.json({
      byWins,
      byHighestScore,
      byStreak
    });
  } catch (err) {
    console.error('Leaderboard fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get match history for the logged-in user
router.get('/history', authenticateJWT, async (req: any, res: Response) => {
  const username = req.user.username;
  try {
    let history;
    if (isMongoConnected) {
      history = await MatchHistory.find({
        'players.username': { $regex: new RegExp(`^${username}$`, 'i') }
      }).sort({ createdAt: -1 });
    } else {
      history = await dbFallback.getMatchHistoryForUser(username);
    }

    return res.json(history);
  } catch (err) {
    console.error('Match history fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
