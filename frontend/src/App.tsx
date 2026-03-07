import { useState } from 'react';
import { ConsentForm } from './components/ConsentForm';
import { MeditationSetup } from './components/MeditationSetup';
import { MeditationSession } from './components/MeditationSession';
import { Questionnaire } from './components/Questionnaire';
import { ScriptDisplay } from './components/ScriptDisplay';

export interface MeditationConfig {
  purpose: 'focus' | 'stress-relief' | 'sleep' | 'energy' | 'anxiety';
  duration: number;
  ambience: 'nature' | 'rain' | 'ocean' | 'silence' | 'bells';
  posture: 'sitting' | 'lying' | 'walking' | 'standing';
  style: string;
  preference_notes?: string;
}

export interface ScriptResult {
  scriptText: string;
  targetSeconds: number;
  estimatedSeconds: number;
  wordCount: number;
  pacingWpm: number;
  goal: string;
  ambience: string;
  posture: string;
  warnings: string[];
  audioUrl?: string;
}

export default function App() {
  const [hasConsented, setHasConsented] = useState(false);
  const [config, setConfig] = useState<MeditationConfig | null>(null);
  const [scriptResult, setScriptResult] = useState<ScriptResult | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);

  if (!hasConsented) {
    return <ConsentForm onConsent={() => setHasConsented(true)} />;
  }

  if (showQuestionnaire) {
    return (
      <Questionnaire
        onComplete={() => {
          setShowQuestionnaire(false);
          setConfig(null);
          setScriptResult(null);
        }}
      />
    );
  }

  if (scriptResult && config && !isSessionActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <ScriptDisplay
          script={scriptResult}
          onBegin={() => setIsSessionActive(true)}
          onBack={() => { setScriptResult(null); setConfig(null); }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {!isSessionActive ? (
        <MeditationSetup
          onStart={(meditationConfig, script) => {
            setConfig(meditationConfig);
            setScriptResult(script);
          }}
        />
      ) : (
        config && (
          <MeditationSession
            config={config}
            audioUrl={scriptResult?.audioUrl}
            onEnd={() => { setIsSessionActive(false); setConfig(null); setScriptResult(null); }}
            onComplete={() => { setIsSessionActive(false); setShowQuestionnaire(true); }}
          />
        )
      )}
    </div>
  );
}
