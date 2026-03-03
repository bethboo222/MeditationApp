import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Copy, Check, ArrowLeft } from 'lucide-react';
import type { ScriptResult } from '../App';

interface ScriptDisplayProps {
  script: ScriptResult;
  onBegin: () => void;
  onBack: () => void;
}

function formatSeconds(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ScriptDisplay({ script, onBegin, onBack }: ScriptDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script.scriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <h1 className="text-4xl mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Your Meditation Script
          </h1>
          <p className="text-gray-500 text-sm">
            {script.goal} · {script.posture} · Estimated duration:{' '}
            <span className="font-medium text-indigo-600">{formatSeconds(script.estimatedSeconds)}</span>
          </p>
        </div>

        <Card className="p-6 backdrop-blur-sm bg-white/80 border-0 shadow-xl mb-4">
          <div className="max-h-[28rem] overflow-y-auto pr-1">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
              {script.scriptText}
            </p>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            className="bg-white/80"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          <Button
            variant="outline"
            onClick={handleCopy}
            className="flex-1 bg-white/80"
          >
            {copied ? (
              <><Check className="w-4 h-4 mr-2 text-green-500" />Copied!</>
            ) : (
              <><Copy className="w-4 h-4 mr-2" />Copy Script</>
            )}
          </Button>

          <Button
            onClick={onBegin}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            Begin Session
          </Button>
        </div>
      </div>
    </div>
  );
}
