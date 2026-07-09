import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Trophy, ShieldAlert, Sparkles, User as UserIcon, Lock, ArrowRight, Play } from 'lucide-react';

const AVATARS = [
  { id: 'avatar1', label: '🏏 Batter Pro' },
  { id: 'avatar2', label: '⚡ Spinner' },
  { id: 'avatar3', label: '🔥 Fast Bowler' },
  { id: 'avatar4', label: '🦁 Super King' },
  { id: 'avatar5', label: '🐯 Knight Rider' },
  { id: 'avatar6', label: '🦅 Challenger' },
  { id: 'avatar7', label: '☠️ Outlaw' },
  { id: 'avatar8', label: '👑 Cricket Emperor' }
];

export const AuthScreen: React.FC = () => {
  const { login, register, loginAsGuest, error, clearError, loading } = useAuth();
  
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('avatar1');
  const [guestMode, setGuestMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    try {
      if (isLoginTab) {
        await login(username, password);
      } else {
        await register(username, password, selectedAvatar);
      }
    } catch (err) {
      // Handled in context
    }
  };

  const handleGuestLogin = async () => {
    try {
      await loginAsGuest(selectedAvatar);
    } catch (err) {
      // Handled in context
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-darkBg text-textPrimary relative overflow-hidden select-none">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brandGreen opacity-10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brandOrange opacity-10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6 }}
        className="text-center mb-8 z-10"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brandGreen/10 border border-brandGreen/25 text-brandGreen text-sm font-semibold mb-4 backdrop-blur-sm">
          <Trophy className="w-4 h-4" />
          <span>Real-time Multiplayer Game</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase">
          SIGMA <span className="text-brandGreen glow-green">LEAGUE</span>
        </h1>
        <p className="text-textSecondary mt-2 max-w-sm text-sm">
          Predict, choose 1-6, and bat or bowl your way to global victory in 10-second showdowns!
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full max-w-md glass p-6 md:p-8 rounded-2xl shadow-2xl border border-white/5 z-10"
      >
        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-500/30 text-red-200 text-sm flex items-start gap-2.5 relative">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            <span className="flex-1 pr-6">{error}</span>
            <button 
              onClick={clearError} 
              className="absolute top-2 right-2 text-red-400 hover:text-red-200 font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab Toggle */}
        {!guestMode && (
          <div className="flex border-b border-white/5 mb-6">
            <button
              onClick={() => { setIsLoginTab(true); clearError(); }}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all ${
                isLoginTab 
                  ? 'border-brandGreen text-brandGreen' 
                  : 'border-transparent text-textSecondary hover:text-textPrimary'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { setIsLoginTab(false); clearError(); }}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all ${
                !isLoginTab 
                  ? 'border-brandGreen text-brandGreen' 
                  : 'border-transparent text-textSecondary hover:text-textPrimary'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {guestMode ? (
          <div>
            <h3 className="text-lg font-bold text-center mb-4 flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-accentGold" />
              <span>Choose Your Avatar</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-2 mb-6">
              {AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar.id)}
                  className={`p-3 rounded-lg border text-sm text-left transition-all ${
                    selectedAvatar === avatar.id
                      ? 'border-brandGreen bg-brandGreen/10 text-white font-bold'
                      : 'border-white/5 bg-white/[0.02] text-textSecondary hover:border-white/10'
                  }`}
                >
                  {avatar.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brandGreen to-emerald-600 hover:from-emerald-500 hover:to-brandGreen active:scale-[0.98] transition-all text-white font-bold py-3.5 px-4 rounded-xl shadow-lg cursor-pointer"
            >
              {loading ? 'Entering Arena...' : 'Play Now as Guest'}
              <Play className="w-4 h-4 fill-white" />
            </button>

            <button
              onClick={() => setGuestMode(false)}
              className="w-full text-center text-sm text-textSecondary hover:text-textPrimary mt-4 block"
            >
              Back to accounts
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                Username
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" />
                <input
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/35 border border-white/5 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-brandGreen/50 focus:bg-black/50 transition-all text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" />
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/35 border border-white/5 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-brandGreen/50 focus:bg-black/50 transition-all text-sm"
                  required
                />
              </div>
            </div>

            {!isLoginTab && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">
                  Select Custom Avatar
                </label>
                <div className="grid grid-cols-2 gap-2 h-[120px] overflow-y-auto pr-1 border border-white/5 p-2 rounded-xl bg-black/20">
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setSelectedAvatar(avatar.id)}
                      className={`p-2 rounded-lg border text-xs text-left transition-all ${
                        selectedAvatar === avatar.id
                          ? 'border-brandGreen bg-brandGreen/10 text-white font-bold'
                          : 'border-white/5 bg-white/[0.01] text-textSecondary hover:border-white/10'
                      }`}
                    >
                      {avatar.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brandGreen to-emerald-600 hover:from-emerald-500 hover:to-brandGreen active:scale-[0.98] transition-all text-white font-bold py-3.5 px-4 rounded-xl shadow-lg cursor-pointer pt-3 mt-4"
            >
              {loading 
                ? (isLoginTab ? 'Logging in...' : 'Registering...') 
                : (isLoginTab ? 'Sign In' : 'Create Account')
              }
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-textSecondary text-xs">OR</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            <button
              type="button"
              onClick={() => {
                setGuestMode(true);
                clearError();
              }}
              className="w-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 active:scale-[0.98] transition-all text-textPrimary font-semibold py-3 px-4 rounded-xl text-sm cursor-pointer"
            >
              ⚡ Instant Guest Play
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};
