import React from 'react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { VolumeX, Volume2, Loader2, LogOut, Trophy } from 'lucide-react';

const AVATAR_EMOJIS: Record<string, string> = {
  avatar1: '🏏',
  avatar2: '⚡',
  avatar3: '🔥',
  avatar4: '🦁',
  avatar5: '🐯',
  avatar6: '🦅',
  avatar7: '☠️',
  avatar8: '👑'
};

const HAND_EMOJIS: Record<number, string> = {
  1: '☝️',
  2: '✌️',
  3: '🤟',
  4: '🖖',
  5: '🖐️',
  6: '🤙'
};

const BUTTON_LABELS: Record<number, string> = {
  1: 'SINGLE',
  2: 'DOUBLE',
  3: 'TRIPLE',
  4: 'BOUNDARY',
  5: 'EXTRAS',
  6: 'MAXIMUM'
};

export const Match: React.FC = () => {
  const { user } = useAuth();
  const { 
    gameState, chooseNumber, leaveRoom, 
    revealSequence, screenShake, 
    inningsBreakMsg, soundMuted, toggleSoundMute 
  } = useGame();

  if (!gameState) {
    return (
      <div className="min-h-screen bg-darkBg text-textPrimary flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-brandGreen border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-textSecondary">Syncing game connection...</p>
        </div>
      </div>
    );
  }

  const {
    currentInnings, target, inningsScore, inningsWickets,
    overNumber, ballNumber, crr, rrr, recentBalls, settings,
    batter, bowler, players, timerValue, status
  } = gameState;

  // Identify local and opponent player states
  const localPlayerState = players.find(p => p.userId === user?.userId);
  const isSpectator = gameState.roomType === 'tournament' && localPlayerState?.role === 'idle';
  const isBatter = localPlayerState?.role === 'bat';

  // Have I submitted a number yet?
  const hasVoted = isSpectator ? false : (isBatter ? (batter?.choiceMade) : (bowler?.choiceMade));
  const isMatchOver = status === 'finished';

  const handleChoice = (val: number) => {
    if (!hasVoted && !revealSequence.isRevealing && !isMatchOver && status === 'playing') {
      chooseNumber(val);
    }
  };

  // Helper to determine circle pill style based on outcome
  const getBallOutcomeStyle = (outcome: string) => {
    if (outcome === 'W') {
      return 'bg-red-500/20 border-red-500/40 text-red-400 font-extrabold';
    }
    if (outcome === '4') {
      return 'bg-blue-500/20 border-blue-500/40 text-blue-400 font-extrabold';
    }
    if (outcome === '6') {
      return 'bg-orange-500/20 border-orange-500/40 text-orange-400 font-extrabold';
    }
    if (outcome === '.') {
      return 'bg-white/[0.01] border-dashed border-white/10 text-textSecondary/20';
    }
    return 'bg-white/[0.04] border-white/10 text-textSecondary font-bold';
  };

  // Calculate deterministic player level for subtitle card
  const getPlayerLevel = (username: string) => {
    const code = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const lvl = (code % 20) + 25;
    return `LVL ${lvl} PRO`;
  };

  // Render exactly 6 delivery progress pills
  const overBalls = Array.from({ length: 6 }, (_, idx) => recentBalls[idx] || '.');

  return (
    <div className={`min-h-screen bg-darkBg text-textPrimary flex flex-col justify-between select-none transition-all duration-150 ${
      screenShake ? 'animate-shake' : ''
    }`}>
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brandGreen opacity-5 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brandOrange opacity-5 rounded-full blur-[120px] -z-10" />

      {/* Innings overlay message banners */}
      {inningsBreakMsg && (
        <div className="bg-brandOrange text-white text-center py-2.5 font-bold animate-pulse text-sm z-40 fixed top-0 left-0 w-full shadow-lg">
          📣 {inningsBreakMsg}
        </div>
      )}

      {/* HEADER SCOREBOARD VIEW */}
      <header className="glass border-b border-white/5 py-4 px-6 relative z-20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo Branding */}
          <div className="flex items-center gap-2.5 select-none">
            <img src="/logo.png" alt="Sigma League Logo" className="w-8 h-8 object-contain select-none pointer-events-none" />
            <div className="flex flex-col text-left">
              <span className="text-[7px] uppercase font-black text-brandGreen tracking-widest leading-none mb-0.5">
                Live Arena
              </span>
              <h2 className="text-base font-black uppercase tracking-wider leading-none">
                SIGMA <span className="text-brandGreen">LEAGUE PRO</span>
              </h2>
            </div>
          </div>

          {/* Centralized Scoreboard Box */}
          <div className="flex bg-black/45 border border-white/5 rounded-xl px-5 py-2 divide-x divide-white/5 text-center items-center shadow-lg">
            <div className="px-4">
              <span className="text-[8px] font-bold text-textSecondary uppercase tracking-wider block mb-0.5">Score</span>
              <span className="text-sm font-black text-white">
                {inningsScore}/{inningsWickets}
              </span>
            </div>
            <div className="px-4">
              <span className="text-[8px] font-bold text-textSecondary uppercase tracking-wider block mb-0.5">Overs</span>
              <span className="text-sm font-black text-white">
                {overNumber}.{ballNumber} <span className="text-[10px] text-textSecondary font-normal">/ {settings.overs}</span>
              </span>
            </div>
            <div className="px-4">
              <span className="text-[8px] font-bold text-textSecondary uppercase tracking-wider block mb-0.5">
                {currentInnings === 2 ? 'RRR' : 'CRR'}
              </span>
              <span className="text-sm font-black text-brandGreen">
                {currentInnings === 2 ? (rrr === 999 ? '∞' : rrr) : crr}
              </span>
            </div>
          </div>
          
          {/* Action Tools */}
          <div className="flex items-center gap-3">
            {target !== null && (
              <span className="text-[9px] uppercase font-black text-brandOrange bg-brandOrange/10 border border-brandOrange/25 px-2.5 py-1 rounded-full">
                Target: {target}
              </span>
            )}
            <button 
              onClick={toggleSoundMute}
              className="p-2 rounded-lg bg-white/[0.03] border border-white/10 text-textSecondary hover:text-textPrimary transition-all cursor-pointer"
              title="Toggle sound"
            >
              {soundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <button 
              onClick={leaveRoom}
              className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              Forfeit
            </button>
          </div>
        </div>
      </header>

      {/* STADIUM PLAYING YARD */}
      <main className="max-w-4xl w-full mx-auto px-4 flex-1 flex flex-col justify-center gap-8 py-6 z-10">
        
        {/* PLAYER VERSUS DUEL WITH CIRCULAR TIMER */}
        <section className="grid grid-cols-3 gap-2 sm:gap-6 items-center">
          
          {/* BATTING PLAYER STAGE */}
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-brandGreen bg-brandGreen/5 flex items-center justify-center text-4xl shadow-[0_0_15px_rgba(16,185,129,0.15)] relative mb-3">
              <span className="select-none">
                {batter ? AVATAR_EMOJIS[batter.avatar] || '🏏' : '❓'}
              </span>
            </div>
            
            <span className="text-[8px] font-black uppercase text-blue-400 bg-blue-500/10 border border-blue-500/25 px-2.5 py-0.5 rounded-full tracking-wider mb-2">
              BATTING
            </span>

            <h4 className="font-bold text-sm text-white truncate max-w-full leading-snug">
              {batter ? batter.username : 'Batter'}
            </h4>
            <p className="text-[9px] text-textSecondary font-semibold">
              {batter ? getPlayerLevel(batter.username) : ''}
            </p>
          </div>

          {/* CIRCULAR TIMER HUD */}
          <div className="flex flex-col items-center justify-center relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border border-white/5 flex flex-col items-center justify-center relative bg-black/35 shadow-lg">
              {/* SVG circular track */}
              <svg className="w-full h-full absolute top-0 left-0 transform -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="40%"
                  stroke="#3B82F6"
                  strokeWidth="3"
                  fill="transparent"
                  strokeDasharray="250"
                  strokeDashoffset={250 - (250 * timerValue) / 10}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <span className="text-3xl font-black text-white leading-none">
                {timerValue.toString().padStart(2, '0')}
              </span>
              <span className="text-[8px] text-textSecondary uppercase font-bold mt-1 tracking-wider">
                Sec Left
              </span>
            </div>
          </div>

          {/* BOWLING PLAYER STAGE */}
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-brandOrange bg-brandOrange/5 flex items-center justify-center text-4xl shadow-[0_0_15px_rgba(249,115,22,0.15)] relative mb-3">
              <span className="select-none">
                {bowler ? AVATAR_EMOJIS[bowler.avatar] || '⚾' : '❓'}
              </span>
            </div>

            <span className="text-[8px] font-black uppercase text-brandOrange bg-brandOrange/10 border border-brandOrange/25 px-2.5 py-0.5 rounded-full tracking-wider mb-2">
              BOWLING
            </span>

            <h4 className="font-bold text-sm text-white truncate max-w-full leading-snug">
              {bowler ? bowler.username : 'Bowler'}
            </h4>
            <p className="text-[9px] text-textSecondary font-semibold">
              {bowler ? getPlayerLevel(bowler.username) : ''}
            </p>
          </div>

        </section>

        {/* DECISION BUTTONS & LIVE SPECTATOR CARD */}
        <section className="glass rounded-2xl border border-white/5 p-6 flex flex-col items-center text-center relative overflow-hidden">
          {/* Commentary & Instructions */}
          <div className="mb-6 max-w-sm">
            <p className="text-xs text-textSecondary italic">
              {revealSequence.isRevealing 
                ? 'Evaluating throw...' 
                : (isSpectator 
                    ? 'Stadium Spectating Mode' 
                    : (hasVoted 
                        ? 'Choice locked. Waiting for opponent...' 
                        : (isBatter 
                            ? 'Select runs to score! Match bowler to not get OUT.' 
                            : 'Match batter\'s selection to claim a WICKET!')))}
            </p>
          </div>

          {isSpectator ? (
            /* Spectator Info Banner */
            <div className="flex flex-col items-center justify-center p-6 border border-brandGreen/25 bg-brandGreen/5 rounded-xl max-w-sm w-full mx-auto text-center my-2 shadow-inner">
              <Loader2 className="w-6 h-6 text-brandGreen animate-spin mb-2" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                LIVE SPECTATING STADIUM
              </h4>
              <p className="text-[10px] text-textSecondary mt-2 leading-relaxed">
                Watching <span className="text-brandGreen font-bold">{batter?.teamName || batter?.username || 'Batter'}</span> batting against <span className="text-brandOrange font-bold">{bowler?.teamName || bowler?.username || 'Bowler'}</span> bowling!
              </p>
            </div>
          ) : (
            /* 1-6 Selector Digit Cards */
            <div className="w-full max-w-lg">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <motion.button
                    key={num}
                    whileHover={{ scale: hasVoted ? 1 : 1.05 }}
                    whileTap={{ scale: hasVoted ? 1 : 0.95 }}
                    onClick={() => handleChoice(num)}
                    disabled={hasVoted || revealSequence.isRevealing || isMatchOver || status !== 'playing'}
                    className={`py-4 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      hasVoted
                        ? 'bg-white/[0.01] border-white/5 text-textSecondary/20'
                        : 'bg-cardBg border-white/5 hover:border-brandGreen hover:bg-brandGreen/5 text-textPrimary'
                    }`}
                  >
                    <span className="text-3xl font-black text-white leading-none mb-1.5">{num}</span>
                    <span className="text-[8px] font-black text-textSecondary tracking-wider select-none">{BUTTON_LABELS[num]}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* OVER deliveries progression indicator */}
        <section className="flex flex-col items-center text-center">
          <span className="text-[9px] font-black text-textSecondary uppercase tracking-widest mb-3">
            Recent Balls
          </span>
          <div className="flex gap-2 justify-center">
            {overBalls.map((outcome, idx) => (
              <span 
                key={idx}
                className={`w-7 h-7 rounded-full text-[10px] font-black flex items-center justify-center border shadow-inner ${getBallOutcomeStyle(outcome)}`}
              >
                {outcome}
              </span>
            ))}
          </div>
        </section>

      </main>

      {/* FOOTER COMMENTARY DESCRIPTIONS */}
      <footer className="text-center py-4 text-xs font-bold text-brandGreen tracking-wide relative z-20">
        📢 {gameState.recentBalls.length > 0 ? "Ball-by-ball actions synced." : "Ready? Make your selection to start!"}
      </footer>

      {/* BALL REVEAL SHOWDOWN OVERLAY */}
      <AnimatePresence>
        {revealSequence.isRevealing && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex justify-center items-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md text-center p-6 rounded-2xl relative"
            >
              {/* Countdown step */}
              {revealSequence.step !== 'reveal' && (
                <div className="space-y-6">
                  <h3 className="text-xs uppercase font-black text-textSecondary tracking-widest">
                    Exchanging Moves...
                  </h3>
                  <div className="flex justify-center gap-12 my-8 text-textSecondary">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-wider mb-2">Batter</div>
                      <div className="w-16 h-16 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-center text-2xl font-bold">
                        ?
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-wider mb-2">Bowler</div>
                      <div className="w-16 h-16 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-center text-2xl font-bold">
                        ?
                      </div>
                    </div>
                  </div>
                  <motion.div 
                    key={revealSequence.step}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1.2, opacity: 1 }}
                    className="text-6xl font-black text-brandOrange"
                  >
                    {revealSequence.step}...
                  </motion.div>
                </div>
              )}

              {/* Reveal Result step */}
              {revealSequence.step === 'reveal' && (
                <div className="space-y-6">
                  
                  {/* Custom stumps flying animations on OUT */}
                  {revealSequence.isWicket && (
                    <div className="h-[120px] flex justify-center items-end relative overflow-hidden mb-4">
                      <motion.div 
                        initial={{ rotate: 0, x: 0, y: 0 }}
                        animate={{ rotate: -35, x: -25, y: -20 }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                        className="w-2 h-20 bg-amber-600 rounded-full mx-1 absolute left-[44%]"
                      />
                      <motion.div 
                        initial={{ rotate: 0, x: 0, y: 0 }}
                        animate={{ rotate: 5, x: 0, y: -15 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className="w-2 h-20 bg-amber-600 rounded-full mx-1 absolute left-[49%]"
                      />
                      <motion.div 
                        initial={{ rotate: 0, x: 0, y: 0 }}
                        animate={{ rotate: 45, x: 25, y: -20 }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                        className="w-2 h-20 bg-amber-600 rounded-full mx-1 absolute left-[54%]"
                      />
                      <motion.div 
                        initial={{ rotate: 0, x: 0, y: 0 }}
                        animate={{ rotate: -130, x: -40, y: -70 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="w-7 h-1.5 bg-amber-800 rounded absolute left-[43%] top-10"
                      />
                      <motion.div 
                        initial={{ rotate: 0, x: 0, y: 0 }}
                        animate={{ rotate: 150, x: 40, y: -70 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="w-7 h-1.5 bg-amber-800 rounded absolute left-[50%] top-10"
                      />
                    </div>
                  )}

                  {!revealSequence.isWicket && (
                    <motion.div 
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-7xl mb-2"
                    >
                      💥
                    </motion.div>
                  )}

                  {/* Numbers Showdown */}
                  <div className="flex justify-center gap-12 my-6">
                    <div className="flex flex-col items-center">
                      <div className="text-xs font-semibold uppercase tracking-wider text-textSecondary mb-2">Batter threw</div>
                      <motion.div
                        initial={{ y: 60, scale: 0.2, rotate: -20, opacity: 0 }}
                        animate={{ y: 0, scale: 1.3, rotate: 0, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
                        className="text-5xl mb-3 select-none"
                      >
                        {revealSequence.batterVal ? HAND_EMOJIS[revealSequence.batterVal] : ''}
                      </motion.div>
                      <div className="w-16 h-16 rounded-2xl border-2 border-brandGreen bg-brandGreen/10 flex items-center justify-center text-3xl font-black text-white">
                        {revealSequence.batterVal}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className="text-xs font-semibold uppercase tracking-wider text-textSecondary mb-2">Bowler threw</div>
                      <motion.div
                        initial={{ y: 60, scale: 0.2, rotate: 20, opacity: 0 }}
                        animate={{ y: 0, scale: 1.3, rotate: 0, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.2 }}
                        className="text-5xl mb-3 select-none"
                      >
                        {revealSequence.bowlerVal ? HAND_EMOJIS[revealSequence.bowlerVal] : ''}
                      </motion.div>
                      <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center text-3xl font-black text-white ${
                        revealSequence.isWicket ? 'border-red-500 bg-red-500/10' : 'border-brandOrange bg-brandOrange/10'
                      }`}>
                        {revealSequence.bowlerVal}
                      </div>
                    </div>
                  </div>

                  {/* Outcome text */}
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <h2 className={`text-3xl font-black uppercase ${
                      revealSequence.isWicket ? 'text-red-400' : 'text-brandGreen'
                    }`}>
                      {revealSequence.isWicket ? 'OUT!' : `+${revealSequence.runsScored} Runs`}
                    </h2>
                    <p className="text-textSecondary text-sm max-w-xs mx-auto mt-2 italic">
                      "{revealSequence.commentary}"
                    </p>
                  </motion.div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GAME FINISHED OVERLAY */}
      <AnimatePresence>
        {isMatchOver && (
          <div className="fixed inset-0 bg-black/90 flex justify-center items-center p-4 z-50 select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md text-center p-8 rounded-2xl border border-white/10 bg-cardBg/90 shadow-2xl relative"
            >
              <Trophy className="w-16 h-16 text-brandOrange mx-auto mb-4 animate-bounce" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-2">
                Match Finished
              </h2>

              <div className="bg-black/35 rounded-xl border border-white/5 p-4 my-6 text-center">
                <span className="text-[10px] text-textSecondary uppercase tracking-widest font-black">Championship Winner</span>
                <p className="text-2xl font-black text-brandGreen mt-1 uppercase">
                  {gameState.players.find(p => p.ready)?.username || 'No Champion'}
                </p>
              </div>

              <button
                onClick={leaveRoom}
                className="w-full bg-brandGreen hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Return to Lobby</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
