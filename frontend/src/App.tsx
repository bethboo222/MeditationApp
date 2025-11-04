import { useState } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { MeditationSetup } from './components/MeditationSetup';
import { MeditationSession } from './components/MeditationSession';
import { Button } from './components/ui/button';
import { LogOut } from 'lucide-react';

export interface MeditationConfig {
  purpose: 'focus' | 'stress-relief' | 'sleep' | 'energy' | 'anxiety';
  duration: number;
  ambience: 'nature' | 'rain' | 'ocean' | 'silence' | 'bells';
  posture: 'sitting' | 'lying' | 'walking' | 'standing';
}

function MeditationApp() {
  const [config, setConfig] = useState<MeditationConfig | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const { user, logout } = useAuth();

  const handleStartMeditation = (meditationConfig: MeditationConfig) => {
    setConfig(meditationConfig);
    setIsSessionActive(true);
  };

  const handleEndSession = () => {
    setIsSessionActive(false);
    setConfig(null);
  };

  // Show auth pages if user is not logged in
  if (!user) {
    if (authView === 'login') {
      return <LoginPage onSwitchToSignup={() => setAuthView('signup')} />;
    }
    return <SignupPage onSwitchToLogin={() => setAuthView('login')} />;
  }

  // Show meditation app if user is logged in
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Logout button - visible on setup screen */}
      {!isSessionActive && (
        <div className="absolute top-6 right-6 z-10">
          <Button
            onClick={logout}
            variant="outline"
            className="bg-white/80 backdrop-blur-sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      )}

      {!isSessionActive ? (
        <MeditationSetup onStart={handleStartMeditation} />
      ) : (
        config && <MeditationSession config={config} onEnd={handleEndSession} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MeditationApp />
    </AuthProvider>
  );
}
