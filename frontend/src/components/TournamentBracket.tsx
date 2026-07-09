import React from 'react';
import { useGame, type ITournamentMatch } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Play, Eye, Lock, Award, LogOut, RefreshCw, Trophy } from 'lucide-react';

export const TournamentBracket: React.FC = () => {
  const { user } = useAuth();
  const { gameState, startTournamentMatch, leaveRoom } = useGame();

  if (!gameState || !gameState.tournamentBracket) {
    return (
      <div className="min-h-screen bg-darkBg text-white flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-brandGreen" />
        <span className="mt-3 text-sm text-textSecondary">Loading tournament bracket...</span>
      </div>
    );
  }

  const { tournamentBracket, tournamentWinnerName, players } = gameState;
  const isHost = players.length > 0 && players[0].userId === user?.userId;

  // Group matches by round
  const prelims = tournamentBracket.filter(m => m.round === 'Round1');
  const quarters = tournamentBracket.filter(m => m.round === 'Quarters');
  const semis = tournamentBracket.filter(m => m.round === 'Semis');
  const final = tournamentBracket.filter(m => m.round === 'Final');

  const handleStartMatch = (matchId: string) => {
    startTournamentMatch(matchId);
  };

  const renderMatchCard = (match: ITournamentMatch) => {
    const isPlaying = match.status === 'playing';
    const isCompleted = match.status === 'completed';
    const isBye = match.status === 'bye';
    const hasPlayers = match.player1 !== null && match.player2 !== null;

    // Check if current user is part of this match
    const isCurrentUserInMatch =
      user &&
      ((match.player1 && match.player1.userId === user.userId) ||
        (match.player2 && match.player2.userId === user.userId));

    // Determine card styling based on state
    let cardBorder = 'border-white/5';
    let cardBg = 'bg-white/[0.01]';
    if (isPlaying) {
      cardBorder = 'border-brandGreen/45 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-pulse';
      cardBg = 'bg-brandGreen/5';
    } else if (isCompleted) {
      cardBorder = 'border-white/10';
      cardBg = 'bg-black/20';
    } else if (hasPlayers && isCurrentUserInMatch) {
      cardBorder = 'border-brandOrange/35';
      cardBg = 'bg-brandOrange/5';
    }

    return (
      <motion.div
        key={match.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-xl border ${cardBg} ${cardBorder} flex flex-col gap-3 min-w-[200px] max-w-[240px] relative`}
      >
        {/* Match Header / Status */}
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black text-textSecondary uppercase tracking-widest">
            Match {match.id.toUpperCase()}
          </span>
          {isPlaying && (
            <span className="flex items-center gap-1 text-[8px] font-bold text-brandGreen bg-brandGreen/10 border border-brandGreen/30 px-1.5 py-0.5 rounded animate-pulse">
              ● LIVE
            </span>
          )}
          {isCompleted && (
            <span className="text-[8px] font-semibold text-textSecondary bg-white/5 px-1.5 py-0.5 rounded">
              FINISHED
            </span>
          )}
          {isBye && (
            <span className="text-[8px] font-semibold text-brandGreen bg-brandGreen/10 px-1.5 py-0.5 rounded">
              ADVANCED BY BYE
            </span>
          )}
          {!hasPlayers && !isCompleted && !isBye && (
            <span className="text-[8px] font-semibold text-textSecondary/50 flex items-center gap-0.5">
              <Lock className="w-2.5 h-2.5" /> LOCK
            </span>
          )}
        </div>

        {/* Competitors */}
        <div className="space-y-2">
          {/* Player 1 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate max-w-[70%]">
              <span className="text-base select-none">
                {match.player1 ? '🏏' : '❓'}
              </span>
              <div className="truncate text-left">
                <p className={`text-xs font-bold truncate ${match.winnerId === match.player1?.userId && isCompleted ? 'text-brandGreen' : 'text-textPrimary'}`}>
                  {match.player1 ? match.player1.username : 'TBD'}
                </p>
                <p className="text-[8px] text-textSecondary truncate">
                  {match.player1 ? match.player1.teamName : 'Waiting...'}
                </p>
              </div>
            </div>
            {isCompleted && match.player1 && (
              <span className={`text-sm font-black ${match.winnerId === match.player1.userId ? 'text-brandGreen' : 'text-textSecondary/50'}`}>
                {match.score1}
              </span>
            )}
          </div>

          {/* VS Divider */}
          <div className="border-t border-white/5 my-1" />

          {/* Player 2 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate max-w-[70%]">
              <span className="text-base select-none">
                {match.player2 ? '🏏' : '❓'}
              </span>
              <div className="truncate text-left">
                <p className={`text-xs font-bold truncate ${match.winnerId === match.player2?.userId && isCompleted ? 'text-brandGreen' : 'text-textPrimary'}`}>
                  {match.player2 ? match.player2.username : 'TBD'}
                </p>
                <p className="text-[8px] text-textSecondary truncate">
                  {match.player2 ? match.player2.teamName : 'Waiting...'}
                </p>
              </div>
            </div>
            {isCompleted && match.player2 && (
              <span className={`text-sm font-black ${match.winnerId === match.player2.userId ? 'text-brandGreen' : 'text-textSecondary/50'}`}>
                {match.score2}
              </span>
            )}
          </div>
        </div>

        {/* Actions panel */}
        {!isCompleted && !isBye && (
          <div className="mt-1">
            {isPlaying ? (
              <button
                onClick={() => handleStartMatch(match.id)}
                className="w-full py-1.5 rounded-lg bg-brandGreen/10 border border-brandGreen/25 text-brandGreen hover:bg-brandGreen hover:text-white transition-all text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Spectate Match</span>
              </button>
            ) : hasPlayers ? (
              isHost ? (
                <button
                  onClick={() => handleStartMatch(match.id)}
                  className="w-full py-1.5 rounded-lg bg-brandGreen hover:bg-emerald-500 text-white transition-all text-[10px] font-bold flex items-center justify-center gap-1 active:scale-[0.97] cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Start Match</span>
                </button>
              ) : isCurrentUserInMatch ? (
                <div className="text-center text-[9px] py-1 bg-brandOrange/10 border border-brandOrange/25 text-brandOrange font-bold rounded animate-pulse">
                  Get ready! Waiting for host...
                </div>
              ) : (
                <div className="text-center text-[9px] py-1 text-textSecondary/60 font-semibold bg-white/[0.02] border border-white/5 rounded">
                  Lobby Scheduled
                </div>
              )
            ) : (
              <div className="text-center text-[9px] py-1 text-textSecondary/30 font-semibold bg-white/[0.01] border border-dashed border-white/5 rounded flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Waiting for Qualifiers</span>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-darkBg text-textPrimary flex flex-col px-4 py-8 relative overflow-hidden select-none">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brandGreen opacity-5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brandOrange opacity-5 rounded-full blur-[120px]" />

      {/* HEADER SECTION */}
      <header className="max-w-7xl mx-auto w-full text-center mb-8 relative z-10">
        <div className="inline-block text-xs font-bold px-3 py-1 bg-brandGreen/10 border border-brandGreen/25 text-brandGreen rounded-full uppercase tracking-wider mb-2">
          IPL Bracket Schedule
        </div>
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
          Tournament Playoffs
        </h2>
        <p className="text-xs text-textSecondary mt-1">
          Single-elimination knockout stage. Play your games, spectate other live matches!
        </p>
      </header>

      {/* CHAMPIONSHIP CELEBRATION BLOCK */}
      {tournamentWinnerName && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md mx-auto w-full glass border border-brandOrange/35 p-6 rounded-2xl text-center mb-8 relative overflow-hidden shadow-2xl z-10 bg-brandOrange/5"
        >
          <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brandOrange/10 via-transparent to-transparent -z-10 animate-spin" style={{ animationDuration: '20s' }} />
          <Trophy className="w-16 h-16 text-brandOrange mx-auto mb-3 animate-bounce" />
          <h3 className="text-lg font-black uppercase text-brandOrange mb-1">
            Tournament Champion!
          </h3>
          <h2 className="text-3xl font-black text-white uppercase tracking-wide">
            {tournamentWinnerName}
          </h2>
          <p className="text-xs text-textSecondary mt-1.5 flex items-center justify-center gap-1">
            <Award className="w-4 h-4 text-brandOrange" />
            <span>Championship victory claimed!</span>
          </p>
          <button
            onClick={leaveRoom}
            className="w-full bg-brandOrange hover:bg-orange-500 active:scale-[0.98] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-6"
          >
            <LogOut className="w-4 h-4" />
            <span>Exit Tournament Lobby</span>
          </button>
        </motion.div>
      )}

      {/* MAIN VISUAL PLAYOFF TREE */}
      {!tournamentWinnerName && (
        <main className="max-w-7xl mx-auto w-full flex-grow flex items-center justify-center overflow-x-auto py-6 px-4 scrollbar-none relative z-10">
          <div className="flex items-start gap-12 sm:gap-20">
            {/* ROUND 1 COLUMN (Optional - only rendered if Round 1 matches exist) */}
            {prelims.length > 0 && (
              <div className="flex flex-col items-center gap-6">
                <h4 className="text-xs font-bold text-textSecondary uppercase tracking-widest border-b border-white/5 pb-2 w-full text-center">
                  Round 1
                </h4>
                <div className="flex flex-col justify-center h-full gap-8 py-4">
                  {prelims.map(renderMatchCard)}
                </div>
              </div>
            )}

            {/* QUARTER FINALS COLUMN */}
            {quarters.length > 0 && (
              <div className="flex flex-col items-center gap-6">
                <h4 className="text-xs font-bold text-textSecondary uppercase tracking-widest border-b border-white/5 pb-2 w-full text-center">
                  Quarter Finals
                </h4>
                <div className="flex flex-col justify-around h-full gap-8 py-4">
                  {quarters.map(renderMatchCard)}
                </div>
              </div>
            )}

            {/* SEMI FINALS COLUMN */}
            <div className="flex flex-col items-center gap-6">
              <h4 className="text-xs font-bold text-textSecondary uppercase tracking-widest border-b border-white/5 pb-2 w-full text-center">
                Semi Finals
              </h4>
              <div className="flex flex-col justify-around h-full gap-16 py-4">
                {semis.map(renderMatchCard)}
              </div>
            </div>

            {/* FINALS COLUMN */}
            <div className="flex flex-col items-center gap-6">
              <h4 className="text-xs font-bold text-textSecondary uppercase tracking-widest border-b border-white/5 pb-2 w-full text-center">
                Championship Final
              </h4>
              <div className="flex flex-col justify-center h-full py-4">
                {final.map(renderMatchCard)}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* FOOTER */}
      {!tournamentWinnerName && (
        <footer className="max-w-7xl mx-auto w-full text-center mt-6 text-[10px] text-textSecondary">
          <button
            onClick={leaveRoom}
            className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 font-bold bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Abandon Tournament Lobby</span>
          </button>
        </footer>
      )}
    </div>
  );
};
