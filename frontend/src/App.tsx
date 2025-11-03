import { useState } from 'react';
import { MeditationSetup } from './components/MeditationSetup';
import { MeditationSession } from './components/MeditationSession';

export interface MeditationConfig {
  purpose: 'focus' | 'stress-relief' | 'sleep' | 'energy' | 'anxiety';
  duration: number;
  ambience: 'nature' | 'rain' | 'ocean' | 'silence' | 'bells';
  posture: 'sitting' | 'lying' | 'walking' | 'standing';
}

export default function App() {
  const [config, setConfig] = useState<MeditationConfig | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const handleStartMeditation = (meditationConfig: MeditationConfig) => {
    setConfig(meditationConfig);
    setIsSessionActive(true);
  };

  const handleEndSession = () => {
    setIsSessionActive(false);
    setConfig(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {!isSessionActive ? (
        <MeditationSetup onStart={handleStartMeditation} />
      ) : (
        config && <MeditationSession config={config} onEnd={handleEndSession} />
      )}
    </div>
  );
}
