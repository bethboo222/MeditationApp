import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Play, Pause, Square, X, Volume2, VolumeX } from 'lucide-react';
import { generateMeditationScript } from './MeditationScriptGenerator';
import type { MeditationConfig } from '../App';

interface MeditationSessionProps {
  config: MeditationConfig;
  scriptText?: string;
  onEnd: () => void;
  onComplete: () => void;
}

function buildQueue(text: string): string[] {
  const chunks: string[] = [];
  for (const para of text.split(/\n\n+/)) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    if (trimmed.length <= 300) {
      chunks.push(trimmed);
    } else {
      const sentences = trimmed.match(/[^.!?]+[.!?]+[\s]*/g) ?? [trimmed];
      chunks.push(...sentences.map(s => s.trim()).filter(Boolean));
    }
  }
  return chunks;
}

export function MeditationSession({ config, scriptText, onEnd, onComplete }: MeditationSessionProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const isPlayingRef = useRef(isPlaying);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // TTS
  const ttsSupported = 'speechSynthesis' in window;
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const [ttsPaused, setTtsPaused] = useState(false);
  const [ttsChunkIndex, setTtsChunkIndex] = useState(0);
  const queueRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const speakNextRef = useRef<() => void>(() => {});

  const script = generateMeditationScript(config);
  const totalSeconds = config.duration * 60;
  const progress = (elapsed / totalSeconds) * 100;
  const sessionCompleted = elapsed >= totalSeconds;

  // Assign speakNextRef each render so utterance callbacks always call the latest version
  speakNextRef.current = () => {
    const idx = indexRef.current;
    if (idx >= queueRef.current.length) {
      setTtsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(queueRef.current[idx]);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.onend = () => {
      indexRef.current = idx + 1;
      setTtsChunkIndex(idx + 1);
      speakNextRef.current();
    };
    utterance.onerror = (e) => {
      if (e.error === 'interrupted') return;
      indexRef.current = idx + 1;
      setTtsChunkIndex(idx + 1);
      speakNextRef.current();
    };
    window.speechSynthesis.speak(utterance);
  };

  // Auto-start TTS on mount; cancel on unmount
  useEffect(() => {
    if (scriptText && ttsSupported) {
      queueRef.current = buildQueue(scriptText);
      indexRef.current = 0;
      setTtsChunkIndex(0);
      setTtsSpeaking(true);
      setTtsPaused(false);
      speakNextRef.current();
    }
    return () => {
      if (ttsSupported) window.speechSynthesis.cancel();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop TTS when session timer completes
  useEffect(() => {
    if (sessionCompleted && ttsSupported) {
      window.speechSynthesis.cancel();
      setTtsSpeaking(false);
      setTtsPaused(false);
    }
  }, [sessionCompleted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync isPlayingRef and suspend/resume AudioContext with play/pause
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (!isPlaying) {
      audioContextRef.current?.suspend().catch(() => {});
    } else {
      audioContextRef.current?.resume().catch(() => {});
    }
  }, [isPlaying]);

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

    if (config.ambience === 'nature' || config.ambience === 'rain') {
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
      const bellInterval = setInterval(() => { if (isPlayingRef.current) playBell(); }, 8000);

      return () => {
        clearInterval(bellInterval);
        if (audioContextRef.current) audioContextRef.current.close();
      };
    }

    return () => {
      if (oscillatorRef.current) oscillatorRef.current.stop();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [config.ambience, isMuted]);

  const togglePlayPause = () => {
    const nowPlaying = isPlaying;
    if (nowPlaying) {
      if (ttsSupported && ttsSpeaking && !ttsPaused) {
        window.speechSynthesis.pause();
        setTtsPaused(true);
      }
    } else {
      if (ttsSupported && ttsSpeaking && ttsPaused) {
        window.speechSynthesis.resume();
        setTtsPaused(false);
      }
    }
    setIsPlaying(!nowPlaying);
  };

  const stopTts = () => {
    window.speechSynthesis.cancel();
    setTtsSpeaking(false);
    setTtsPaused(false);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = nextMuted ? 0 : 0.1;
    }
  };

  const handleEnd = () => {
    if (ttsSupported) window.speechSynthesis.cancel();
    onEnd();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentPhaseData = script.phases[currentPhase];
  const currentChunk = queueRef.current[ttsChunkIndex] ?? '';
  const showTtsContent = !!scriptText && ttsSupported && ttsSpeaking;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 opacity-90" />

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl top-1/4 left-1/4 animate-pulse" />
        <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl bottom-1/4 right-1/4 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative w-full max-w-2xl">
        <Button
          onClick={handleEnd}
          variant="ghost"
          size="icon"
          className="absolute -top-16 right-0 text-white hover:bg-white/10"
        >
          <X className="w-6 h-6" />
        </Button>

        <Card className="p-8 backdrop-blur-sm bg-white/10 border-white/20 text-white">
          {/* Timer */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-2 tabular-nums">
              {formatTime(totalSeconds - elapsed)}
            </div>
            <div className="text-sm text-white/60">remaining</div>
          </div>

          <Progress value={progress} className="h-2 mb-8 bg-white/20" />

          {/* Content: TTS chunk or phase guidance */}
          <div className="mb-8">
            {showTtsContent ? (
              <>
                <div className="text-sm text-white/60 mb-2 uppercase tracking-wider flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  {ttsPaused ? 'Paused' : 'Speaking'}
                </div>
                <div className="text-xl leading-relaxed">{currentChunk}</div>
              </>
            ) : (
              <>
                <div className="text-sm text-white/60 mb-2 uppercase tracking-wider">
                  {currentPhaseData.title}
                </div>
                <div className="text-xl leading-relaxed">
                  {currentPhaseData.guidance}
                </div>
              </>
            )}
          </div>

          {/* Breathing guide — only when not in TTS mode */}
          {!showTtsContent && currentPhaseData.breathingPattern && (
            <div className="mb-8 p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="text-sm text-white/60 mb-2">Breathing Pattern</div>
              <div className="text-lg">{currentPhaseData.breathingPattern}</div>
            </div>
          )}

          {/* Unsupported browser notice */}
          {scriptText && !ttsSupported && (
            <div className="mb-8 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-sm">
              Text-to-speech is not supported in this browser. The script is available on the previous screen.
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

            {ttsSpeaking ? (
              <Button
                onClick={stopTts}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                title="Stop narration"
              >
                <Square className="w-5 h-5" />
              </Button>
            ) : (
              <div className="w-10" />
            )}
          </div>

          {/* Session info */}
          <div className="mt-8 pt-6 border-t border-white/10 flex justify-between text-sm text-white/60">
            <div>
              {config.purpose.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </div>
            <div>
              {config.posture.charAt(0).toUpperCase() + config.posture.slice(1)}
            </div>
          </div>
        </Card>

        {/* Completion */}
        {sessionCompleted && (
          <div className="mt-6 text-center">
            <div className="text-2xl text-white mb-4">✨ Session Complete ✨</div>
            <Button
              onClick={onComplete}
              className="bg-white text-indigo-900 hover:bg-white/90"
            >
              Continue
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
