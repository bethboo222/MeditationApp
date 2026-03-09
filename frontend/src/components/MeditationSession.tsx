import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Play, Pause, Square, X, Volume2, VolumeX } from 'lucide-react';
import type { MeditationConfig } from '../App';

interface MeditationSessionProps {
  config: MeditationConfig;
  audioUrl?: string;
  onEnd: () => void;
  onComplete: () => void;
}

export function MeditationSession({ config, audioUrl, onEnd, onComplete }: MeditationSessionProps) {
  const [isPlaying, setIsPlaying] = useState(false); // starts false; flips true when audio ready
  const isPlayingRef = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioDuration, setAudioDuration] = useState(config.duration * 60);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambienceRef = useRef<HTMLAudioElement | null>(null);

  const progress = audioDuration > 0 ? (elapsed / audioDuration) * 100 : 0;

  // --- Resolve audioUrl relative to VITE_API_BASE_URL ---
  const resolvedAudioUrl = audioUrl
    ? `${import.meta.env.VITE_API_BASE_URL ?? ''}${audioUrl}`
    : null;

  // --- Set up HTMLAudioElement ---
  useEffect(() => {
    if (!resolvedAudioUrl) return;

    const audio = new Audio(resolvedAudioUrl);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      setAudioDuration(audio.duration);
    };

    audio.ontimeupdate = () => {
      setElapsed(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
      setSessionCompleted(true);
    };

    audio.onerror = () => {
      console.error('Audio playback error');
      setAudioError(true);
      setIsPlaying(false);
      isPlayingRef.current = false;
    };

    audio.oncanplaythrough = () => {
      // Auto-play once buffered
      audio.play().then(() => {
        setIsPlaying(true);
        isPlayingRef.current = true;
      }).catch((err) => {
        console.error('Auto-play blocked:', err);
        // Leave isPlaying=false; user can press Play
      });
    };

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const AMBIENCE_SRCS: Partial<Record<MeditationConfig['ambience'], string>> = {
    nature: '/ambience/forest.mp3',
    rain:   '/ambience/rain.mp3',
    ocean:  '/ambience/ocean.mp3',
    bells:  '/ambience/bowls.mp3',
  };

  // --- Sync isPlayingRef ---
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // --- Set up looping ambience audio element ---
  useEffect(() => {
    const src = AMBIENCE_SRCS[config.ambience];
    if (!src) return;

    const amb = new Audio(src);
    amb.loop = true;
    amb.volume = 0.25;
    ambienceRef.current = amb;

    return () => {
      amb.pause();
      amb.src = '';
      ambienceRef.current = null;
    };
  }, [config.ambience]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Sync ambience play/pause with session state ---
  useEffect(() => {
    const amb = ambienceRef.current;
    if (!amb) return;
    if (isPlaying && !isMuted) {
      amb.play().catch(() => {});
    } else {
      amb.pause();
    }
  }, [isPlaying, isMuted]);

  // --- Controls ---
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      isPlayingRef.current = false;
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
      isPlayingRef.current = true;
    }
  };

  const stopAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setElapsed(0);
    setIsPlaying(false);
    isPlayingRef.current = false;
  };

  const toggleMute = () => {
    setIsMuted(m => !m);
  };

  const handleEnd = () => {
    audioRef.current?.pause();
    ambienceRef.current?.pause();
    onEnd();
  };

  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const remaining = Math.max(0, audioDuration - elapsed);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 opacity-90" />

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl top-1/4 left-1/4 animate-pulse" />
        <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl bottom-1/4 right-1/4 animate-pulse"
          style={{ animationDelay: '1s' }} />
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
            <div className="text-6xl mb-2 tabular-nums">{formatTime(remaining)}</div>
            <div className="text-sm text-white/60">remaining</div>
          </div>

          <Progress value={progress} className="h-2 mb-8 bg-white/20" />

          {/* Status */}
          <div className="mb-8 text-center">
            {audioError ? (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
                Audio could not be loaded. Please go back and try again.
              </div>
            ) : !resolvedAudioUrl ? (
              <div className="text-white/60 text-lg">Follow along with your meditation.</div>
            ) : isPlaying ? (
              <div className="flex items-center justify-center gap-2 text-white/70">
                <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm uppercase tracking-wider">Audio guide playing</span>
              </div>
            ) : sessionCompleted ? (
              <div className="text-white/70 text-sm uppercase tracking-wider">Session complete</div>
            ) : (
              <div className="text-white/50 text-sm uppercase tracking-wider">Paused</div>
            )}
          </div>

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
              disabled={audioError || sessionCompleted}
              className="w-16 h-16 rounded-full bg-white text-indigo-900 hover:bg-white/90 disabled:opacity-40"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </Button>

            {resolvedAudioUrl && !sessionCompleted ? (
              <Button
                onClick={stopAudio}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                title="Stop and reset to beginning"
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
              {config.purpose.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </div>
            <div>
              {config.posture.charAt(0).toUpperCase() + config.posture.slice(1)}
            </div>
          </div>
        </Card>

        {/* Completion */}
        {sessionCompleted && (
          <div className="mt-6 text-center">
            <div className="text-2xl text-white mb-4"> Session Complete </div>
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
