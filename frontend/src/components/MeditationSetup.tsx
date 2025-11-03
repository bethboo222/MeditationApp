import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Slider } from './ui/slider';
import { Brain, Heart, Moon, Zap, Wind, Sparkles, CloudRain, Waves, Volume2, VolumeX, Bell } from 'lucide-react';
import type { MeditationConfig } from '../App';

interface MeditationSetupProps {
  onStart: (config: MeditationConfig) => void;
}

const purposes = [
  { value: 'focus', label: 'Focus & Clarity', icon: Brain, description: 'Sharpen your mind' },
  { value: 'stress-relief', label: 'Stress Relief', icon: Heart, description: 'Find your calm' },
  { value: 'sleep', label: 'Better Sleep', icon: Moon, description: 'Drift away peacefully' },
  { value: 'energy', label: 'Energy Boost', icon: Zap, description: 'Revitalize yourself' },
  { value: 'anxiety', label: 'Ease Anxiety', icon: Wind, description: 'Release tension' },
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
  const [duration, setDuration] = useState(10);
  const [ambience, setAmbience] = useState<MeditationConfig['ambience']>('nature');
  const [posture, setPosture] = useState<MeditationConfig['posture']>('sitting');

  const handleStart = () => {
    onStart({ purpose, duration, ambience, posture });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-5xl mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Your Personal Meditation
          </h1>
          <p className="text-gray-600">
            Design a meditation session that's uniquely yours
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

          {/* Duration Selection */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <Label className="text-lg">Duration</Label>
              <span className="text-2xl text-indigo-600">{duration} min</span>
            </div>
            <Slider
              value={[duration]}
              onValueChange={(value) => setDuration(value[0])}
              min={3}
              max={30}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Quick (3 min)</span>
              <span>Extended (30 min)</span>
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

          <Button
            onClick={handleStart}
            className="w-full h-14 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            Begin Your Journey
          </Button>
        </Card>
      </div>
    </div>
  );
}
