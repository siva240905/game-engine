import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';

import { Copy, Check, LogOut, Loader2, Shield, Clock, Send, MessageSquare, Trophy, Settings, Wallet } from 'lucide-react';



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

export const Room: React.FC = () => {
  const { user } = useAuth();
  const { 
    roomCode, players, settings, toggleReady, 
    startMatch, leaveRoom, gameState, 
    lobbyChatMessages, sendLobbyChatMessage 
  } = useGame();
  
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new chat messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lobbyChatMessages]);

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendLobbyChatMessage(chatInput.trim());
      setChatInput('');
    }
  };


  const isHost = players.length > 0 && players[0].userId === user?.userId;
  const isTournament = gameState?.roomType === 'tournament';
  const isOpponentIn = isTournament ? players.length >= 3 : players.length === 2;
  const allReady = isTournament
    ? players.length >= 3 && players.every(p => p.ready)
    : players.length === 2 && players.every(p => p.ready);

  // Helper to calculate a deterministic level for players based on their names
  const getPlayerLevel = (username: string) => {
    const code = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const level = (code % 25) + 20;
    const titles = ['Pro', 'Elite', 'Master', 'Champion', 'Legend'];
    const title = titles[code % titles.length];
    return `Level ${level} ${title}`;
  };

  return (
    <div className="min-h-screen bg-darkBg text-textPrimary flex flex-col relative overflow-hidden select-none pb-8">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-brandGreen opacity-5 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-brandOrange opacity-5 rounded-full blur-[120px] -z-10" />

      {/* STADIUM HEADER */}
      <header className="glass border-b border-white/5 py-4 px-6 sticky top-0 backdrop-blur-md z-30 shadow-lg mb-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Sigma League Logo" className="w-7 h-7 object-contain select-none pointer-events-none" />
            <h2 className="text-lg font-black uppercase tracking-wider">
              SIGMA <span className="text-brandGreen">LEAGUE PRO</span>
            </h2>
          </div>
          
          {/* Middle Nav Indicators */}
          <div className="hidden md:flex items-center gap-8 text-xs font-bold text-textSecondary uppercase tracking-widest">
            <span className="text-white border-b-2 border-brandGreen pb-1 select-none cursor-pointer">Arena</span>
            <span className="hover:text-white transition-all cursor-pointer">History</span>
            <span className="hover:text-white transition-all cursor-pointer">Leaderboard</span>
          </div>

          <div className="flex items-center gap-3 text-textSecondary">
            <button className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition-all cursor-pointer" title="Wallet">
              <Wallet className="w-4 h-4 text-white" />
            </button>
            <button className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition-all cursor-pointer" title="Settings">
              <Settings className="w-4 h-4 text-white" />
            </button>
            <div className="w-8 h-8 rounded-full border border-brandGreen/35 bg-brandGreen/10 flex items-center justify-center font-bold text-xs text-brandGreen select-none">
              {user?.username.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* LOBBY MAIN GRID */}
      <main className="max-w-7xl mx-auto w-full px-6 grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow">
        
        {/* LEFT COLUMN: ROOM DETAILS & PLAYERS (Spans 2 columns on desktop) */}
        <div className="md:col-span-2 flex flex-col justify-between space-y-6">
          
          {/* PRIVATE LOBBY CODE CARD */}
          <div className="glass border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
            <span className="text-xs text-textSecondary font-black uppercase tracking-widest mb-3">
              Private Lobby
            </span>
            
            <div className="bg-black/35 border border-white/5 py-3 px-6 rounded-xl flex items-center gap-4 mb-4">
              <span className="text-3xl md:text-4xl font-black tracking-widest text-white select-all">
                {roomCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-2 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] active:scale-95 text-textSecondary hover:text-white transition-all cursor-pointer"
                title="Copy room code"
              >
                {copied ? <Check className="w-4 h-4 text-brandGreen" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-[11px] text-textSecondary mb-5 max-w-sm">
              Share this code with your opponent to start the battle.
            </p>

            {/* SETTINGS PILL TAGS */}
            {settings && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-[10px] font-bold uppercase tracking-wider text-textSecondary">
                  <Clock className="w-3.5 h-3.5 text-brandOrange" />
                  <span>{settings.overs} {settings.overs === 1 ? 'Over' : 'Overs'}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-[10px] font-bold uppercase tracking-wider text-textSecondary">
                  <Shield className="w-3.5 h-3.5 text-brandGreen" />
                  <span>{settings.wickets} {settings.wickets === 1 ? 'Wicket' : 'Wickets'}</span>
                </div>
              </div>
            )}
          </div>

          {/* PLAYERS GRID CARD */}
          <div>
            {isTournament ? (
              /* IPL TOURNAMENT VIEW STAGE (10 SLOTS) */
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                {Array.from({ length: 10 }, (_, idx) => {
                  const player = players[idx] || null;
                  if (player) {
                    const isLocal = player.userId === user?.userId;
                    return (
                      <div 
                        key={player.userId} 
                        className={`bg-white/[0.01] border p-3 rounded-xl flex flex-col items-center text-center relative overflow-hidden transition-all ${
                          isLocal ? 'border-brandGreen/35 bg-brandGreen/5' : 'border-white/5'
                        }`}
                      >
                        {idx === 0 && (
                          <span className="absolute top-1 right-1 text-[7px] font-black bg-brandGreen/25 text-brandGreen px-1 rounded uppercase tracking-wider">
                            HOST
                          </span>
                        )}
                        <div className="w-10 h-10 rounded-xl bg-brandGreen/20 border border-brandGreen/35 flex items-center justify-center font-black text-brandGreen text-sm mb-1">
                          {player.username.substring(0, 2).toUpperCase()}
                        </div>
                        <h5 className="font-bold text-[10px] truncate max-w-full text-white">
                          {player.username}
                        </h5>
                        <p className="text-[8px] text-brandGreen font-bold truncate max-w-full mt-0.5">
                          {player.teamName || 'Unknown XI'}
                        </p>
                        <div className="mt-2 w-full">
                          {isLocal ? (
                            <button
                              onClick={() => toggleReady(!player.ready)}
                              className={`w-full py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                                player.ready 
                                  ? 'bg-brandGreen border-brandGreen/10 text-white' 
                                  : 'bg-white/[0.02] border-white/10 text-textSecondary hover:border-white/20'
                              }`}
                            >
                              {player.ready ? '✓ Ready' : 'Ready'}
                            </button>
                          ) : (
                            <div className={`py-1 rounded text-[8px] font-black uppercase tracking-wider border ${
                              player.ready ? 'bg-brandGreen/10 border-brandGreen/30 text-brandGreen' : 'bg-white/[0.01] border-white/5 text-textSecondary/50'
                            }`}>
                              {player.ready ? '✓ Ready' : 'Unready'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div key={`empty-${idx}`} className="border border-white/5 bg-white/[0.01] p-3 rounded-xl flex flex-col justify-center items-center py-5 border-dashed">
                        <Loader2 className="w-4 h-4 text-brandOrange/35 animate-spin mb-1.5" />
                        <span className="text-[8px] font-semibold text-textSecondary/50">Slot {idx + 1}</span>
                        <span className="text-[7px] text-textSecondary/30">Vacant</span>
                      </div>
                    );
                  }
                })}
              </div>
            ) : (
              /* SINGLE MATCH VIEW STAGE (2 SLOTS - Host vs Opponent) */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* HOST CARD (Player 1) */}
                <div className={`p-6 rounded-2xl border text-center flex flex-col items-center relative overflow-hidden transition-all bg-white/[0.02] ${
                  players[0]?.ready ? 'border-brandGreen bg-brandGreen/[0.03] shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-white/5'
                }`}>
                  <span className="absolute top-2.5 right-2.5 text-[9px] font-black bg-brandGreen/25 text-brandGreen px-1.5 py-0.5 rounded flex items-center gap-0.5 uppercase tracking-wider">
                    <Shield className="w-2.5 h-2.5" />
                    <span>HOST</span>
                  </span>

                  <div className="w-20 h-20 rounded-2xl bg-brandGreen/20 border border-brandGreen/35 flex items-center justify-center font-black text-brandGreen text-3xl mb-4 shadow-inner">
                    {players[0] ? AVATAR_EMOJIS[players[0].avatar] || '🏏' : '❓'}
                  </div>
                  
                  <h4 className="font-bold text-base text-white">
                    {players[0] ? players[0].username : 'Waiting...'}
                  </h4>
                  
                  <p className="text-xs text-textSecondary mt-0.5 font-semibold">
                    {players[0] ? getPlayerLevel(players[0].username) : ''}
                  </p>

                  {players[0]?.teamName && (
                    <p className="text-xs text-brandGreen font-bold mt-1.5 uppercase truncate max-w-full">
                      {players[0].teamName}
                    </p>
                  )}

                  {players[0] && (
                    <div className="mt-6 w-full">
                      {players[0].userId === user?.userId ? (
                        <button
                          onClick={() => toggleReady(!players[0].ready)}
                          className={`w-full py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-all border cursor-pointer ${
                            players[0].ready 
                              ? 'bg-brandGreen border-brandGreen/20 text-white shadow-md' 
                              : 'bg-white/[0.02] border-white/10 hover:border-white/20 text-white'
                          }`}
                        >
                          {players[0].ready ? '✓ Ready' : 'Ready'}
                        </button>
                      ) : (
                        <div className={`py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider border ${
                          players[0].ready ? 'bg-brandGreen/10 border-brandGreen/30 text-brandGreen' : 'bg-white/[0.01] border-white/5 text-textSecondary'
                        }`}>
                          {players[0].ready ? '✓ Ready' : 'Unready'}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* CHALLENGER CARD (Player 2) */}
                <div className={`p-6 rounded-2xl border text-center flex flex-col items-center relative overflow-hidden transition-all bg-white/[0.02] ${
                  players[1]?.ready ? 'border-brandGreen bg-brandGreen/[0.03] shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-white/5'
                }`}>
                  {isOpponentIn ? (
                    <>
                      <div className="w-20 h-20 rounded-2xl bg-brandOrange/25 border border-brandOrange/35 flex items-center justify-center font-black text-brandOrange text-3xl mb-4 shadow-inner">
                        {AVATAR_EMOJIS[players[1].avatar] || '🏏'}
                      </div>
                      
                      <h4 className="font-bold text-base text-white">
                        {players[1].username}
                      </h4>
                      
                      <p className="text-xs text-textSecondary mt-0.5 font-semibold">
                        {getPlayerLevel(players[1].username)}
                      </p>

                      {players[1]?.teamName && (
                        <p className="text-xs text-brandOrange font-bold mt-1.5 uppercase truncate max-w-full">
                          {players[1].teamName}
                        </p>
                      )}

                      <div className="mt-6 w-full">
                        {players[1].userId === user?.userId ? (
                          <button
                            onClick={() => toggleReady(!players[1].ready)}
                            className={`w-full py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-all border cursor-pointer ${
                              players[1].ready 
                                ? 'bg-brandGreen border-brandGreen/20 text-white shadow-md' 
                                : 'bg-white/[0.02] border-white/10 hover:border-white/20 text-white'
                            }`}
                          >
                            {players[1].ready ? '✓ Ready' : 'Ready'}
                          </button>
                        ) : (
                          <div className={`py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider border ${
                            players[1].ready ? 'bg-brandGreen/10 border-brandGreen/30 text-brandGreen' : 'bg-white/[0.01] border-white/5 text-textSecondary'
                          }`}>
                            {players[1].ready ? '✓ Ready' : 'Unready'}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex flex-col justify-center items-center py-8">
                      <Loader2 className="w-8 h-8 text-brandOrange animate-spin mb-4" />
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        Waiting for Opponent
                      </h4>
                      <p className="text-[10px] text-textSecondary mt-1.5 max-w-[160px] leading-relaxed">
                        Share the code above with your opponent to start the battle.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* PLAY MATCH / TOURNAMENT ACTIONS CONTAINER */}
          <div className="w-full flex justify-center py-2">
            {isHost && (
              <button
                onClick={startMatch}
                disabled={!allReady}
                className={`px-12 py-4 rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2.5 border transition-all active:scale-[0.98] cursor-pointer ${
                  allReady
                    ? 'bg-blue-500 border-blue-400 text-white hover:bg-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)] font-bold'
                    : 'bg-white/[0.01] border-white/5 text-textSecondary/40 cursor-not-allowed'
                }`}
              >
                <Shield className="w-4 h-4 text-white" />
                <span>{isTournament ? 'Start IPL Tournament' : 'Start Match'}</span>
              </button>
            )}
            
            {isTournament && players.length < 3 && (
              <p className="text-center text-[10px] text-brandOrange font-semibold uppercase tracking-wider animate-pulse">
                Waiting for at least 3 players to join (Current: {players.length}/10)...
              </p>
            )}

            {!isHost && isOpponentIn && !allReady && (
              <p className="text-center text-[10px] text-brandOrange font-semibold uppercase tracking-wider animate-pulse">
                Waiting for host to start the match...
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: REAL-TIME CHAT & STATS (Spans 1 column on desktop) */}
        <div className="flex flex-col gap-6">
          
          {/* REAL-TIME CHAT CONTAINER */}
          <div className="glass border border-white/5 rounded-2xl flex flex-col h-[320px] md:h-[400px] shadow-lg relative overflow-hidden">
            <header className="px-5 py-3 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brandGreen" />
                <span className="text-xs font-black uppercase tracking-wider">Lobby Chat</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-brandGreen animate-ping" />
            </header>

            {/* Scrollable bubble area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none">
              {/* Default Welcome System bubble */}
              <div className="flex flex-col items-start max-w-[85%]">
                <span className="text-[8px] font-bold text-textSecondary uppercase tracking-wider mb-1 ml-1">SYSTEM</span>
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-[11px] text-textSecondary leading-normal rounded-tl-none">
                  Welcome to the arena! Use this space to talk strategy or just flex.
                </div>
              </div>

              {/* Mapped Messages */}
              {lobbyChatMessages.map((chat, idx) => {
                const isMe = chat.userId === user?.userId;
                if (isMe) {
                  return (
                    <div key={idx} className="flex flex-col items-end max-w-[85%] ml-auto">
                      <span className="text-[8px] font-bold text-brandGreen uppercase tracking-wider mb-1 mr-1">You</span>
                      <div className="p-3 rounded-2xl bg-blue-600/90 text-white text-[11px] leading-normal rounded-tr-none shadow-md">
                        {chat.message}
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={idx} className="flex flex-col items-start max-w-[85%]">
                      <span className="text-[8px] font-bold text-textSecondary uppercase tracking-wider mb-1 ml-1">{chat.username}</span>
                      <div className="p-3 rounded-2xl bg-white/[0.06] border border-white/10 text-[11px] text-white leading-normal rounded-tl-none">
                        {chat.message}
                      </div>
                    </div>
                  );
                }
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input field */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-white/5 bg-black/20 flex gap-2">
              <input
                type="text"
                maxLength={80}
                placeholder="Type banter here..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-grow bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 outline-none focus:border-brandGreen/40 focus:bg-black/30 transition-all text-xs font-medium"
              />
              <button
                type="submit"
                className="p-2.5 bg-brandGreen hover:bg-emerald-500 rounded-xl text-white transition-all cursor-pointer flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* RECENT STATS CARD */}
          <div className="glass border border-white/5 p-5 rounded-2xl shadow-lg flex flex-col">
            <h4 className="text-xs font-black uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-brandOrange" />
              <span>Recent Lobby Stats</span>
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-textSecondary">Matches today</span>
                <span className="font-bold text-white">1,204</span>
              </div>
              <div className="border-t border-white/5" />
              <div className="flex justify-between items-center text-xs">
                <span className="text-textSecondary">Highest Streak</span>
                <span className="font-bold text-brandOrange">12 Wins</span>
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* FOOTER BUTTONS */}
      <footer className="max-w-7xl mx-auto w-full px-6 mt-8 flex justify-center text-[10px] text-textSecondary relative z-10">
        <button
          onClick={leaveRoom}
          className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 font-bold bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Abandon Lobby</span>
        </button>
      </footer>
    </div>
  );
};
