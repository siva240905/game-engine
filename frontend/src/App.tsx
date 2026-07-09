import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider, useGame } from './context/GameContext';
import { AuthScreen } from './components/AuthScreen';
import { Home } from './components/Home';
import { Room } from './components/Room';
import { Match } from './components/Match';
import { TournamentBracket } from './components/TournamentBracket';

const AppContent: React.FC = () => {
  const { loading: authLoading } = useAuth();
  const { activeScreen } = useGame();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-darkBg text-textPrimary flex flex-col items-center justify-center select-none">
        <div className="w-12 h-12 border-4 border-brandGreen border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold uppercase tracking-wider">
          SIGMA <span className="text-brandGreen">LEAGUE</span>
        </h2>
        <p className="text-xs text-textSecondary mt-2">Loading game environment...</p>
      </div>
    );
  }

  switch (activeScreen) {
    case 'auth':
      return <AuthScreen />;
    case 'home':
      return <Home />;
    case 'lobby':
      return <Room />;
    case 'match':
      return <Match />;
    case 'tournament_bracket':
      return <TournamentBracket />;
    default:
      return <AuthScreen />;
  }
};

function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </AuthProvider>
  );
}

export default App;
