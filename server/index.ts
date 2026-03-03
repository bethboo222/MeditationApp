import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
app.use(express.json());
app.use(cors());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30_000,
});

const VALID_GOALS = ['Focus & Clarity', 'Stress Relief', 'Better Sleep', 'Energy Boost', 'Ease Anxiety'];
const VALID_AMBIENCES = ['Forest Sounds', 'Gentle Rain', 'Ocean Waves', 'Singing Bowls', 'Pure Silence'];
const VALID_POSTURES = ['Seated', 'Lying Down', 'Walking', 'Standing'];
const PACING_WPM = 125;

function buildPrompt(goal: string, ambience: string, posture: string, durationSeconds: number, targetWords: number): string {
  return `You are a professional meditation guide. Write a single, continuous guided meditation script of approximately ${targetWords} words (±3%).

Session details:
- Goal: ${goal}
- Background sound: ${ambience}
- Posture: ${posture}
- Duration: ${Math.round(durationSeconds / 60)} minutes

Guidelines:
- Speak directly to the listener in second person ("you", "your")
- Use a warm, calm, and soothing tone throughout
- Include gentle breathing guidance woven naturally into the text
- Flow smoothly as if being spoken aloud
- Do not include headers, section breaks, bullet points, or formatting
- Write only the spoken meditation text — nothing else`;
}

async function generateScript(goal: string, ambience: string, posture: string, durationSeconds: number, targetWords: number): Promise<string> {
  const maxTokens = Math.round(targetWords * 1.6);
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: buildPrompt(goal, ambience, posture, durationSeconds, targetWords) }],
    max_tokens: maxTokens,
  });
  return response.choices[0].message.content ?? '';
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

app.post('/api/generate-meditation', async (req, res) => {
  const { goal, durationSeconds, ambience, posture } = req.body;

  if (!VALID_GOALS.includes(goal)) {
    res.status(400).json({ error: `Invalid goal. Must be one of: ${VALID_GOALS.join(', ')}` });
    return;
  }
  if (!VALID_AMBIENCES.includes(ambience)) {
    res.status(400).json({ error: `Invalid ambience. Must be one of: ${VALID_AMBIENCES.join(', ')}` });
    return;
  }
  if (!VALID_POSTURES.includes(posture)) {
    res.status(400).json({ error: `Invalid posture. Must be one of: ${VALID_POSTURES.join(', ')}` });
    return;
  }
  if (typeof durationSeconds !== 'number' || durationSeconds < 180 || durationSeconds > 900) {
    res.status(400).json({ error: 'durationSeconds must be a number between 180 and 900' });
    return;
  }

  const targetWords = Math.round(PACING_WPM * (durationSeconds / 60));
  const tolerance = Math.round(targetWords * 0.03);
  const warnings: string[] = [];

  try {
    let scriptText = await generateScript(goal, ambience, posture, durationSeconds, targetWords);
    let wordCount = countWords(scriptText);

    if (Math.abs(wordCount - targetWords) > tolerance) {
      const adjusted = targetWords + (targetWords - wordCount);
      warnings.push(`Word count ${wordCount} outside tolerance ±${tolerance}; retrying with target ${adjusted}`);
      scriptText = await generateScript(goal, ambience, posture, durationSeconds, Math.max(50, adjusted));
      wordCount = countWords(scriptText);
    }

    const estimatedSeconds = Math.round((wordCount / PACING_WPM) * 60);

    res.json({
      scriptText,
      targetSeconds: durationSeconds,
      estimatedSeconds,
      wordCount,
      pacingWpm: PACING_WPM,
      goal,
      ambience,
      posture,
      warnings,
    });
  } catch (err) {
    console.error('OpenAI error:', err);
    res.status(500).json({ error: 'Failed to generate meditation script. Please try again.' });
  }
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`Meditation server running on http://localhost:${PORT}`));
