import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, LogIn, Trophy, History, User as UserIcon, 
  Volume2, VolumeX, LogOut, ArrowRight, ShieldAlert
} from 'lucide-react';

const AVATAR_LABELS: Record<string, string> = {
  avatar1: '🏏 Batter Pro',
  avatar2: '⚡ Spinner',
  avatar3: '🔥 Fast Bowler',
  avatar4: '🦁 Super King',
  avatar5: '🐯 Knight Rider',
  avatar6: '🦅 Challenger',
  avatar7: '☠️ Outlaw',
  avatar8: '👑 Cricket Emperor'
};

export const Home: React.FC = () => {
  const { user, logout, token, apiUrl } = useAuth();
  const { createRoom, joinRoom, soundMuted, toggleSoundMute, systemError, clearSystemError } = useGame();

  const [activeTab, setActiveTab] = useState<'play' | 'history' | 'leaderboard' | 'profile'>('play');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // Game Setup Settings
  const [selectedOvers, setSelectedOvers] = useState<number>(1);
  const [selectedWickets, setSelectedWickets] = useState<number>(1);
  const [playVsBot, setPlayVsBot] = useState<boolean>(false);
  const [roomType, setRoomType] = useState<'single' | 'tournament'>('single');
  const [teamName, setTeamName] = useState('');

  useEffect(() => {
    if (user && !teamName) {
      setTeamName(`${user.username} XI`);
    }
  }, [user]);
  
  // Join Room Inputs
  const [joinCode, setJoinCode] = useState('');

  // Loaded DB data
  const [profileStats, setProfileStats] = useState<any>(null);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Fetch Stats data based on selected tab
  const fetchStatsData = async () => {
    if (!token) return;
    setStatsLoading(true);
    try {
      if (activeTab === 'profile') {
        const res = await fetch(`${apiUrl}/api/stats/my-stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProfileStats(data);
        }
      } else if (activeTab === 'history') {
        const res = await fetch(`${apiUrl}/api/stats/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMatchHistory(data);
        }
      } else if (activeTab === 'leaderboard') {
        const res = await fetch(`${apiUrl}/api/stats/leaderboard`);
        if (res.ok) {
          const data = await res.json();
          setLeaderboard(data);
        }
      }
    } catch (err) {
      console.error('Error loading tab statistics:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsData();
  }, [activeTab]);

  const handleCreateRoom = () => {
    const isBot = playVsBot && roomType === 'single';
    createRoom(selectedOvers, selectedWickets, isBot, roomType, teamName || `${user?.username} XI`);
    setShowCreateModal(false);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      joinRoom(joinCode.toUpperCase(), teamName || `${user?.username} XI`);
      setShowJoinModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-darkBg text-textPrimary relative overflow-hidden select-none pb-12">
      {/* Background radial overlay */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-darkBg to-darkBg -z-10" />

      {/* SYSTEM ERROR banner */}
      {systemError && (
        <div className="bg-red-950/70 border-b border-red-500/30 text-red-200 py-3 px-4 flex items-center justify-between text-sm z-50 relative">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            <span>{systemError}</span>
          </div>
          <button onClick={clearSystemError} className="text-red-400 hover:text-red-200 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Header */}
      <header className="glass border-b border-white/5 py-4 px-6 sticky top-0 backdrop-blur-md z-30 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Sigma League Logo" className="w-8 h-8 object-contain select-none pointer-events-none" />
            <h2 className="text-xl font-black uppercase tracking-wider">
              SIGMA <span className="text-brandGreen">LEAGUE</span>
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Audio Toggle */}
            <button 
              onClick={toggleSoundMute}
              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-textSecondary hover:text-textPrimary transition-all cursor-pointer"
              title={soundMuted ? "Unmute sounds" : "Mute sounds"}
            >
              {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Profile Pill */}
            {user && (
              <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 py-1.5 pl-3 pr-2.5 rounded-xl">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold leading-3">{user.username}</div>
                  <div className="text-[10px] text-textSecondary leading-3 mt-1">
                    {AVATAR_LABELS[user.avatar] || 'Rookie'}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-brandGreen/25 flex items-center justify-center font-bold text-brandGreen">
                  {user.username.substring(0, 2).toUpperCase()}
                </div>
                <button 
                  onClick={logout}
                  className="p-1.5 rounded-lg text-textSecondary hover:text-red-400 hover:bg-red-500/10 transition-all ml-1 cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content Container */}
      <main className="max-w-4xl mx-auto px-4 mt-8">
        
        {/* Navigation Tabs */}
        <div className="flex bg-cardBg/50 border border-white/5 p-1 rounded-xl mb-6">
          <button
            onClick={() => setActiveTab('play')}
            className={`flex-1 py-3.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'play' 
                ? 'bg-brandGreen text-white shadow-md' 
                : 'text-textSecondary hover:text-textPrimary hover:bg-white/[0.02]'
            }`}
          >
            🏏 Play Arena
          </button>
          
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-3.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'leaderboard' 
                ? 'bg-brandGreen text-white shadow-md' 
                : 'text-textSecondary hover:text-textPrimary hover:bg-white/[0.02]'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Leaderboard</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'history' 
                ? 'bg-brandGreen text-white shadow-md' 
                : 'text-textSecondary hover:text-textPrimary hover:bg-white/[0.02]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'profile' 
                ? 'bg-brandGreen text-white shadow-md' 
                : 'text-textSecondary hover:text-textPrimary hover:bg-white/[0.02]'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Profile</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            
            {/* PLAY TAB */}
            {activeTab === 'play' && (
              <motion.div
                key="play-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid md:grid-cols-2 gap-6"
              >
                {/* Create Room Panel */}
                <div className="glass p-6 md:p-8 rounded-2xl border border-white/5 flex flex-col justify-between hover:border-brandGreen/20 transition-all group">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-brandGreen/10 border border-brandGreen/25 text-brandGreen flex items-center justify-center mb-6">
                      <Plus className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Create Custom Room</h3>
                    <p className="text-textSecondary text-sm mb-6">
                      Set up a private cricket room with custom overs and wickets, and invite your friend to join.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full bg-brandGreen hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Configure & Create</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Join Room Panel */}
                <div className="glass p-6 md:p-8 rounded-2xl border border-white/5 flex flex-col justify-between hover:border-brandOrange/25 transition-all group">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-brandOrange/10 border border-brandOrange/25 text-brandOrange flex items-center justify-center mb-6">
                      <LogIn className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Join Lobby Room</h3>
                    <p className="text-textSecondary text-sm mb-6">
                      Have a room code? Paste the code below to instantly connect and start the head-to-head match.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="w-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Enter Room Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* LEADERBOARD TAB */}
            {activeTab === 'leaderboard' && (
              <motion.div
                key="leaderboard-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="glass p-6 rounded-2xl border border-white/5"
              >
                <div className="flex items-center gap-2 mb-6">
                  <Trophy className="w-5 h-5 text-accentGold" />
                  <h3 className="text-xl font-bold">Global Rankings</h3>
                </div>

                {statsLoading ? (
                  <div className="text-center py-12 text-textSecondary text-sm">Loading leaderboard...</div>
                ) : !leaderboard || leaderboard.byWins.length === 0 ? (
                  <div className="text-center py-12 text-textSecondary text-sm">No rankings recorded yet. Be the first!</div>
                ) : (
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Wins column */}
                    <div className="space-y-3">
                      <div className="text-xs font-black uppercase text-brandGreen tracking-wider border-b border-brandGreen/20 pb-1">
                        🏆 Most Wins
                      </div>
                      <div className="space-y-2">
                        {leaderboard.byWins.map((player: any, idx: number) => (
                          <div key={player._id} className="flex justify-between items-center bg-black/20 p-2.5 rounded-lg border border-white/5 text-sm">
                            <span className="truncate max-w-[120px]">{idx + 1}. {player.username}</span>
                            <span className="font-bold text-brandGreen">{player.wins} W</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Highest Score Column */}
                    <div className="space-y-3">
                      <div className="text-xs font-black uppercase text-accentGold tracking-wider border-b border-accentGold/20 pb-1">
                        🏏 High Score
                      </div>
                      <div className="space-y-2">
                        {leaderboard.byHighestScore.map((player: any, idx: number) => (
                          <div key={player._id} className="flex justify-between items-center bg-black/20 p-2.5 rounded-lg border border-white/5 text-sm">
                            <span className="truncate max-w-[120px]">{idx + 1}. {player.username}</span>
                            <span className="font-bold text-accentGold">{player.highestScore} runs</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Streak Column */}
                    <div className="space-y-3">
                      <div className="text-xs font-black uppercase text-brandOrange tracking-wider border-b border-brandOrange/20 pb-1">
                        🔥 Best Streak
                      </div>
                      <div className="space-y-2">
                        {leaderboard.byStreak.map((player: any, idx: number) => (
                          <div key={player._id} className="flex justify-between items-center bg-black/20 p-2.5 rounded-lg border border-white/5 text-sm">
                            <span className="truncate max-w-[120px]">{idx + 1}. {player.username}</span>
                            <span className="font-bold text-brandOrange">{player.winningStreak} wins</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
              <motion.div
                key="history-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="glass p-6 rounded-2xl border border-white/5"
              >
                <div className="flex items-center gap-2 mb-6">
                  <History className="w-5 h-5 text-brandGreen" />
                  <h3 className="text-xl font-bold">Match History</h3>
                </div>

                {statsLoading ? (
                  <div className="text-center py-12 text-textSecondary text-sm">Loading history...</div>
                ) : matchHistory.length === 0 ? (
                  <div className="text-center py-12 text-textSecondary text-sm">
                    No matches played yet. Connect and play to record matches!
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                    {matchHistory.map((match: any) => {
                      const isWinner = match.winnerId === user?.userId;
                      const isDraw = match.winnerId === null;
                      const outcomeText = isDraw ? 'Draw' : (isWinner ? 'WIN' : 'LOSS');
                      
                      // Identify self and opponent
                      const self = match.players.find((p: any) => p.userId === user?.userId);
                      const opponent = match.players.find((p: any) => p.userId !== user?.userId);

                      return (
                        <div 
                          key={match._id}
                          className={`flex items-center justify-between p-4 rounded-xl border bg-black/20 ${
                            isDraw 
                              ? 'border-white/5' 
                              : (isWinner ? 'border-brandGreen/20 hover:border-brandGreen/40' : 'border-red-500/20 hover:border-red-500/40')
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                isDraw 
                                  ? 'bg-slate-700 text-slate-200' 
                                  : (isWinner ? 'bg-brandGreen/25 text-brandGreen' : 'bg-red-500/20 text-red-400')
                              }`}>
                                {outcomeText}
                              </span>
                              <span className="text-xs text-textSecondary">
                                {new Date(match.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="text-sm font-semibold mt-2">
                              vs {opponent?.username || 'Guest'} ({match.overs} Over, {match.wickets} Wkt)
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm font-bold text-textPrimary">
                              {self?.role === 'bat' ? 'Batting First' : 'Bowling First'}
                            </div>
                            <div className="text-xs text-textSecondary mt-1">
                              Runs: {self?.score} | Wkts: {self?.wickets}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <motion.div
                key="profile-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="glass p-6 rounded-2xl border border-white/5"
              >
                <div className="flex items-center gap-2 mb-6">
                  <UserIcon className="w-5 h-5 text-brandGreen" />
                  <h3 className="text-xl font-bold font-sans">Player Statistics</h3>
                </div>

                {statsLoading ? (
                  <div className="text-center py-12 text-textSecondary text-sm">Loading profile...</div>
                ) : !profileStats ? (
                  <div className="text-center py-12 text-textSecondary text-sm">Could not find statistics.</div>
                ) : (
                  <div>
                    {/* Header info */}
                    <div className="flex items-center gap-4 border-b border-white/5 pb-6 mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-brandGreen/20 border border-brandGreen/30 flex items-center justify-center text-2xl font-black text-brandGreen">
                        {user?.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-2xl font-bold">{user?.username}</h4>
                        <p className="text-textSecondary text-sm">
                          {AVATAR_LABELS[user?.avatar || ''] || 'Hand Cricketer'}
                        </p>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      
                      <div className="bg-black/25 border border-white/5 p-4 rounded-xl text-center">
                        <div className="text-textSecondary text-xs font-semibold uppercase tracking-wider mb-1">Played</div>
                        <div className="text-2xl font-bold">{profileStats.matchesPlayed}</div>
                      </div>

                      <div className="bg-black/25 border border-white/5 p-4 rounded-xl text-center">
                        <div className="text-brandGreen text-xs font-semibold uppercase tracking-wider mb-1">Wins</div>
                        <div className="text-2xl font-bold text-brandGreen">{profileStats.wins}</div>
                      </div>

                      <div className="bg-black/25 border border-white/5 p-4 rounded-xl text-center">
                        <div className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-1">Losses</div>
                        <div className="text-2xl font-bold text-red-400">{profileStats.losses}</div>
                      </div>

                      <div className="bg-black/25 border border-white/5 p-4 rounded-xl text-center">
                        <div className="text-accentGold text-xs font-semibold uppercase tracking-wider mb-1">Win %</div>
                        <div className="text-2xl font-bold text-accentGold">{profileStats.winRate}%</div>
                      </div>

                      <div className="bg-black/25 border border-white/5 p-4 rounded-xl text-center">
                        <div className="text-textSecondary text-xs font-semibold uppercase tracking-wider mb-1">High Score</div>
                        <div className="text-2xl font-bold">{profileStats.highestScore}</div>
                      </div>

                      <div className="bg-black/25 border border-white/5 p-4 rounded-xl text-center">
                        <div className="text-textSecondary text-xs font-semibold uppercase tracking-wider mb-1">Avg Score</div>
                        <div className="text-2xl font-bold">{profileStats.avgScore}</div>
                      </div>

                      <div className="bg-black/25 border border-white/5 p-4 rounded-xl text-center">
                        <div className="text-brandOrange text-xs font-semibold uppercase tracking-wider mb-1">Max Streak</div>
                        <div className="text-2xl font-bold text-brandOrange">{profileStats.winningStreak}</div>
                      </div>

                      <div className="bg-black/25 border border-white/5 p-4 rounded-xl text-center">
                        <div className="text-textSecondary text-xs font-semibold uppercase tracking-wider mb-1">Wickets Taken</div>
                        <div className="text-2xl font-bold">{profileStats.wicketsTaken}</div>
                      </div>

                    </div>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* CREATE ROOM MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass border border-white/10 p-6 rounded-2xl shadow-2xl relative"
            >
              <button 
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 text-textSecondary hover:text-textPrimary font-bold"
              >
                ✕
              </button>

              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-brandGreen" />
                <span>Create Game Lobby</span>
              </h3>

              <div className="space-y-6">
                
                {/* Select Overs */}
                <div>
                  <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-3">
                    Match Length (Overs)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 5, 10].map((over) => (
                      <button
                        key={over}
                        onClick={() => setSelectedOvers(over)}
                        className={`py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                          selectedOvers === over
                            ? 'border-brandGreen bg-brandGreen/10 text-white'
                            : 'border-white/5 bg-white/[0.01] text-textSecondary hover:border-white/10'
                        }`}
                      >
                        {over} {over === 1 ? 'Over' : 'Overs'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Select Wickets */}
                <div>
                  <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-3">
                    Wickets per Inning
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 5, 10].map((wkt) => (
                      <button
                        key={wkt}
                        onClick={() => setSelectedWickets(wkt)}
                        className={`py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                          selectedWickets === wkt
                            ? 'border-brandGreen bg-brandGreen/10 text-white'
                            : 'border-white/5 bg-white/[0.01] text-textSecondary hover:border-white/10'
                        }`}
                      >
                        {wkt} {wkt === 1 ? 'Wkt' : 'Wkts'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Team Name Input */}
                <div>
                  <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">
                    Enter Your Team Name (IPL Style)
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="e.g. Mumbai Indians"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full bg-black/35 border border-white/5 rounded-xl py-3 px-4 outline-none focus:border-brandGreen/50 focus:bg-black/50 transition-all text-sm font-semibold"
                    required
                  />
                </div>

                {/* Match Type Selection */}
                <div>
                  <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-3">
                    Tournament Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRoomType('single')}
                      className={`py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                        roomType === 'single'
                          ? 'border-brandGreen bg-brandGreen/10 text-white'
                          : 'border-white/5 bg-white/[0.01] text-textSecondary hover:border-white/10'
                      }`}
                    >
                      🏏 Single Match
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoomType('tournament')}
                      className={`py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                        roomType === 'tournament'
                          ? 'border-brandGreen bg-brandGreen/10 text-white'
                          : 'border-white/5 bg-white/[0.01] text-textSecondary hover:border-white/10'
                      }`}
                    >
                      🏆 IPL Tournament
                    </button>
                  </div>
                </div>

                {/* Play Mode Selection (Only for single matches) */}
                {roomType === 'single' && (
                  <div>
                    <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-3">
                      Opponent Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPlayVsBot(false)}
                        className={`py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                          !playVsBot
                            ? 'border-brandGreen bg-brandGreen/10 text-white'
                            : 'border-white/5 bg-white/[0.01] text-textSecondary hover:border-white/10'
                        }`}
                      >
                        👥 Vs Friend
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlayVsBot(true)}
                        className={`py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                          playVsBot
                            ? 'border-brandGreen bg-brandGreen/10 text-white'
                            : 'border-white/5 bg-white/[0.01] text-textSecondary hover:border-white/10'
                        }`}
                      >
                        🤖 Vs Bot
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCreateRoom}
                  className="w-full bg-brandGreen hover:bg-emerald-500 active:scale-[0.98] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
                >
                  <Plus className="w-4 h-4" />
                  <span>{roomType === 'tournament' ? 'Start IPL Tournament Lobby' : (playVsBot ? 'Start Match Instantly' : 'Create Lobby Room')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* JOIN ROOM MODAL */}
      <AnimatePresence>
        {showJoinModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass border border-white/10 p-6 rounded-2xl shadow-2xl relative"
            >
              <button 
                onClick={() => setShowJoinModal(false)}
                className="absolute top-4 right-4 text-textSecondary hover:text-textPrimary font-bold"
              >
                ✕
              </button>

              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <LogIn className="w-5 h-5 text-brandOrange" />
                <span>Join Lobby Room</span>
              </h3>

              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">
                    Enter Your Team Name (IPL Style)
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="e.g. Chennai Super Kings"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full bg-black/35 border border-white/5 rounded-xl py-3 px-4 outline-none focus:border-brandOrange/50 focus:bg-black/50 transition-all text-sm font-semibold mb-3"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">
                    Lobby Code (6 Characters)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter Code (e.g. AB12XY)"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full text-center bg-black/35 border border-white/5 rounded-xl py-3.5 outline-none focus:border-brandOrange/50 focus:bg-black/50 transition-all font-bold tracking-widest text-lg"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-brandOrange hover:bg-orange-500 active:scale-[0.98] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Join Match Room</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
