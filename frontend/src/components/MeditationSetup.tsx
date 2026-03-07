import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Slider } from './ui/slider';
import { Brain, Heart, Moon, Zap, Wind, Sparkles, CloudRain, Waves, VolumeX, Bell, Loader2, ScanLine, Eye, Fingerprint } from 'lucide-react';
import type { MeditationConfig, ScriptResult } from '../App';

interface MeditationSetupProps {
  onStart: (config: MeditationConfig, script: ScriptResult) => void;
}

const purposes = [
  { value: 'focus', label: 'Focus & Clarity', icon: Brain, description: 'Sharpen your mind' },
  { value: 'stress-relief', label: 'Stress Relief', icon: Heart, description: 'Find your calm' },
  { value: 'sleep', label: 'Better Sleep', icon: Moon, description: 'Drift away peacefully' },
  { value: 'energy', label: 'Energy Boost', icon: Zap, description: 'Revitalize yourself' },
  { value: 'anxiety', label: 'Ease Anxiety', icon: Wind, description: 'Release tension' },
] as const;

const styles = [
  { value: 'Breath Anchor', icon: Wind, description: 'Breath as your focus object' },
  { value: 'Body Scan', icon: ScanLine, description: 'Progressive attention through the body' },
  { value: 'Open Monitoring', icon: Eye, description: 'Wide, non-reactive awareness' },
  { value: 'Grounding Senses', icon: Fingerprint, description: 'Anchor through the five senses' },
  { value: 'Loving-Kindness', icon: Heart, description: 'Cultivate warmth and compassion' },
  { value: 'Wind-Down', icon: Moon, description: 'Gentle decompression into rest' },
] as const;

const ambiences = [
  { value: 'nature', label: 'Forest Sounds', icon: Sparkles },
  { value: 'rain', label: 'Gentle Rain', icon: CloudRain },
  { value: 'ocean', label: 'Ocean Waves', icon: Waves },
  { value: 'bells', label: 'Singing Bowls', icon: Bell },
  { value: 'silence', label: 'Pure Silence', icon: VolumeX },
] as const;

const postures = [
  { value: 'sitting', label: 'Seated', description: 'Traditional meditation posture' },
  { value: 'lying', label: 'Lying Down', description: 'Perfect for relaxation' },
  { value: 'walking', label: 'Walking', description: 'Mindful movement' },
  { value: 'standing', label: 'Standing', description: 'Grounded and alert' },
] as const;

export function MeditationSetup({ onStart }: MeditationSetupProps) {
  const [purpose, setPurpose] = useState<MeditationConfig['purpose']>('focus');
  const [style, setStyle] = useState<string>('Breath Anchor');
  const [duration, setDuration] = useState(5);
  const [ambience, setAmbience] = useState<MeditationConfig['ambience']>('nature');
  const [posture, setPosture] = useState<MeditationConfig['posture']>('sitting');
  const [preferenceNotes, setPreferenceNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDuration = (minutes: number): string => {
    if (minutes < 1) {
      const seconds = Math.round(minutes * 60);
      return `${seconds} sec`;
    }
    return `${minutes} min`;
  };

  const handleStart = async () => {
    setIsLoading(true);
    setError(null);

    const goal = purposes.find(p => p.value === purpose)!.label;
    const ambienceLabel = ambiences.find(a => a.value === ambience)!.label;
    const postureLabel = postures.find(p => p.value === posture)!.label;
    const trimmedNotes = preferenceNotes.trim();

    // Use VITE_API_BASE_URL in production; fall back to Vite dev proxy in local dev
    const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';

    try {
      const res = await fetch(`${apiBase}/api/generate-meditation-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          durationSeconds: duration * 60,
          ambience: ambienceLabel,
          posture: postureLabel,
          style,
          ...(trimmedNotes ? { preference_notes: trimmedNotes } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to generate script');
      }

      onStart({ purpose, duration, ambience, posture, style, ...(trimmedNotes ? { preference_notes: trimmedNotes } : {}) }, data as ScriptResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-5xl mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Welcome
          </h1>
          <p className="text-gray-600">
            Pick a goal, a meditation style, and any preferences.
          </p>
        </div>

        <Card className="p-8 backdrop-blur-sm bg-white/80 border-0 shadow-xl">
          {/* Purpose Selection */}
          <div className="mb-10">
            <Label className="text-lg mb-4 block">What do you need today?</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {purposes.map(({ value, label, icon: Icon, description }) => (
                <button
                  key={value}
                  onClick={() => setPurpose(value)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    purpose === value
                      ? 'border-indigo-500 bg-indigo-50 shadow-md'
                      : 'border-gray-200 hover:border-indigo-300 bg-white'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${purpose === value ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <div className="font-medium mb-1">{label}</div>
                  <div className="text-sm text-gray-500">{description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Style Selection */}
          <div className="mb-10">
            <Label className="text-lg mb-4 block">Meditation Style</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {styles.map(({ value, icon: Icon, description }) => (
                <button
                  key={value}
                  onClick={() => setStyle(value)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    style === value
                      ? 'border-indigo-500 bg-indigo-50 shadow-md'
                      : 'border-gray-200 hover:border-indigo-300 bg-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-2 ${style === value ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <div className="font-medium text-sm mb-1">{value}</div>
                  <div className="text-xs text-gray-500">{description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration Selection */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <Label className="text-lg">Duration</Label>
              <span className="text-2xl text-indigo-600">{formatDuration(duration)}</span>
            </div>
            <Slider
              value={[duration]}
              onValueChange={(value) => setDuration(value[0])}
              min={3}
              max={15}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Quick (3 min)</span>
              <span>Extended (15 min)</span>
            </div>
          </div>

          {/* Ambience Selection */}
          <div className="mb-10">
            <Label className="text-lg mb-4 block">Ambience</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {ambiences.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setAmbience(value)}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center ${
                    ambience === value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300 bg-white'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${ambience === value ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <div className="text-sm text-center">{label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Posture Selection */}
          <div className="mb-8">
            <Label className="text-lg mb-4 block">Posture</Label>
            <RadioGroup value={posture} onValueChange={(value) => setPosture(value as MeditationConfig['posture'])}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {postures.map(({ value, label, description }) => (
                  <label
                    key={value}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      posture === value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300 bg-white'
                    }`}
                  >
                    <RadioGroupItem value={value} className="sr-only" />
                    <div className="font-medium mb-1">{label}</div>
                    <div className="text-sm text-gray-500">{description}</div>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Preference Notes */}
          <div className="mb-8">
            <Label className="text-lg mb-1 block">Anything you want more/less of?</Label>
            <p className="text-sm text-gray-500 mb-3">One sentence. Example: Less talking, more silence.</p>
            <div className="relative">
              <input
                type="text"
                value={preferenceNotes}
                onChange={(e) => {
                  const v = e.target.value.replace(/[\r\n]/g, '');
                  if (v.length <= 120) setPreferenceNotes(v);
                }}
                placeholder="e.g., Less talking, no visualization, gentle tone…"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none bg-white text-sm pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                {preferenceNotes.length}/120
              </span>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
          )}

          <Button
            onClick={handleStart}
            disabled={isLoading}
            className="w-full h-14 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating your personalised session… (this takes ~15–30 s)
              </>
            ) : (
              'Generate My Session'
            )}
          </Button>
        </Card>
      </div>
    </div>
  );
}
