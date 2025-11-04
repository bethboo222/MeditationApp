import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Play, Pause, X, Volume2, VolumeX } from 'lucide-react';
import { generateMeditationScript } from './MeditationScriptGenerator';
import type { MeditationConfig } from '../App';

interface MeditationSessionProps {
  config: MeditationConfig;
  onEnd: () => void;
}

export function MeditationSession({ config, onEnd }: MeditationSessionProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const script = generateMeditationScript(config);
  const totalSeconds = config.duration * 60;
  const progress = (elapsed / totalSeconds) * 100;

  // Determine current phase based on elapsed time
  useEffect(() => {
    const phaseTime = totalSeconds / script.phases.length;
    const phase = Math.min(Math.floor(elapsed / phaseTime), script.phases.length - 1);
    setCurrentPhase(phase);
  }, [elapsed, totalSeconds, script.phases.length]);

  // Timer
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setElapsed((prev) => {
        if (prev >= totalSeconds) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, totalSeconds]);

  // Ambient audio generation
  useEffect(() => {
    if (config.ambience === 'silence' || isMuted) return;

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.1;
    gainNodeRef.current = gainNode;

    // Create ambient sound based on selection
    if (config.ambience === 'nature' || config.ambience === 'rain') {
      // Brown noise for nature/rain sounds
      const bufferSize = 4096;
      const brownNoise = audioContext.createScriptProcessor(bufferSize, 1, 1);
      let lastOut = 0.0;
      
      brownNoise.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5;
        }
      };

      brownNoise.connect(gainNode);
      gainNode.connect(audioContext.destination);
    } else if (config.ambience === 'ocean') {
      // Low frequency oscillation for ocean waves
      const oscillator = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      oscillator.type = 'sine';
      oscillator2.type = 'sine';
      oscillator.frequency.value = 0.2;
      oscillator2.frequency.value = 0.15;
      
      const waveGain = audioContext.createGain();
      waveGain.gain.value = 0.5;
      
      oscillator.connect(waveGain);
      oscillator2.connect(waveGain);
      waveGain.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      oscillator2.start();
      
      oscillatorRef.current = oscillator;
    } else if (config.ambience === 'bells') {
      // Periodic bell sounds using oscillator
      const playBell = () => {
        const bell = audioContext.createOscillator();
        const bellGain = audioContext.createGain();
        
        bell.frequency.value = 432;
        bell.type = 'sine';
        
        bellGain.gain.setValueAtTime(0.3, audioContext.currentTime);
        bellGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 3);
        
        bell.connect(bellGain);
        bellGain.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        bell.start();
        bell.stop(audioContext.currentTime + 3);
      };

      playBell();
      const bellInterval = setInterval(playBell, 8000);

      return () => {
        clearInterval(bellInterval);
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };
    }

    return () => {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [config.ambience, isMuted]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0.1 : 0;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentPhaseData = script.phases[currentPhase];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Background gradient based on purpose */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 opacity-90" />
      
      {/* Ambient animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl top-1/4 left-1/4 animate-pulse" />
        <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl bottom-1/4 right-1/4 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Close button */}
        <Button
          onClick={onEnd}
          variant="ghost"
          size="icon"
          className="absolute -top-16 right-0 text-white hover:bg-white/10"
        >
          <X className="w-6 h-6" />
        </Button>

        <Card className="p-8 backdrop-blur-sm bg-white/10 border-white/20 text-white">
          {/* Timer Display */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-2 tabular-nums">
              {formatTime(totalSeconds - elapsed)}
            </div>
            <div className="text-sm text-white/60">remaining</div>
          </div>

          {/* Progress Bar */}
          <Progress value={progress} className="h-2 mb-8 bg-white/20" />

          {/* Current Phase */}
          <div className="mb-8">
            <div className="text-sm text-white/60 mb-2 uppercase tracking-wider">
              {currentPhaseData.title}
            </div>
            <div className="text-xl leading-relaxed">
              {currentPhaseData.guidance}
            </div>
          </div>

          {/* Breathing Guide (if applicable) */}
          {currentPhaseData.breathingPattern && (
            <div className="mb-8 p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="text-sm text-white/60 mb-2">Breathing Pattern</div>
              <div className="text-lg">{currentPhaseData.breathingPattern}</div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={toggleMute}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>

            <Button
              onClick={togglePlayPause}
              size="icon"
              className="w-16 h-16 rounded-full bg-white text-indigo-900 hover:bg-white/90"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </Button>

            <div className="w-10" /> {/* Spacer for symmetry */}
          </div>

          {/* Session Info */}
          <div className="mt-8 pt-6 border-t border-white/10 flex justify-between text-sm text-white/60">
            <div>
              {config.purpose.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </div>
            <div>
              {config.posture.charAt(0).toUpperCase() + config.posture.slice(1)}
            </div>
          </div>
        </Card>

        {/* Completion message */}
        {elapsed >= totalSeconds && (
          <div className="mt-6 text-center">
            <div className="text-2xl text-white mb-4">✨ Session Complete ✨</div>
            <Button
              onClick={onEnd}
              className="bg-white text-indigo-900 hover:bg-white/90"
            >
              Return to Setup
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
