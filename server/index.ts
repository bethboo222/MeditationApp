import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY is not set.');
  process.exit(1);
}

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
      const prod = (process.env.FRONTEND_ORIGIN ?? '').trim();
      if (prod && origin === prod) return callback(null, true);
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
  })
);

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30_000 });

// --- Audio constants (OpenAI PCM: 24 kHz, 16-bit, mono) ---
const SAMPLE_RATE    = 24000;
const CHANNELS       = 1;
const BIT_DEPTH      = 16;
const BYTES_PER_SEC  = SAMPLE_RATE * CHANNELS * (BIT_DEPTH / 8); // 48 000

const TTS_MODEL = process.env.TTS_MODEL ?? 'tts-1-hd';
const TTS_VOICE = (process.env.TTS_VOICE ?? 'nova') as
  | 'alloy' | 'ash' | 'coral' | 'echo' | 'fable' | 'nova' | 'onyx' | 'sage' | 'shimmer';

const TMP_DIR = path.join(os.tmpdir(), 'meditation-audio');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const MAX_SILENCE_SECONDS = 40; // hard cap: no single silence may exceed this

// ─── WAV helpers ─────────────────────────────────────────────────────────────

function buildWavHeader(dataBytes: number): Buffer {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + dataBytes, 4);
  h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(CHANNELS, 22);
  h.writeUInt32LE(SAMPLE_RATE, 24); h.writeUInt32LE(BYTES_PER_SEC, 28);
  h.writeUInt16LE(CHANNELS * (BIT_DEPTH / 8), 32); h.writeUInt16LE(BIT_DEPTH, 34);
  h.write('data', 36); h.writeUInt32LE(dataBytes, 40);
  return h;
}

const FADE_SAMPLES = Math.round(0.030 * SAMPLE_RATE); // 30 ms — no audible click

function applyFades(pcm: Buffer): Buffer {
  if (pcm.length < 4) return pcm;
  const r = Buffer.from(pcm);
  const n = r.length / 2;
  const f = Math.min(FADE_SAMPLES, Math.floor(n / 4));
  for (let i = 0; i < f; i++) {
    const t = i / f;
    r.writeInt16LE(Math.round(r.readInt16LE(i * 2) * t), i * 2);
    r.writeInt16LE(Math.round(r.readInt16LE((n - 1 - i) * 2) * t), (n - 1 - i) * 2);
  }
  return r;
}

function silencePcm(seconds: number): Buffer {
  const n   = Math.round(seconds * SAMPLE_RATE * CHANNELS);
  const buf = Buffer.allocUnsafe(n * (BIT_DEPTH / 8));
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round((Math.random() * 2 - 1) * 8), i * 2);
  return applyFades(buf);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SegmentTag  = 'opening' | 'grounding' | 'breath' | 'body_scan' | 'main' | 'closing';
type ActionType  = 'none' | 'take_2_breaths' | 'rest_here' | 'notice_feel'
                 | 'soften_release' | 'body_scan_transition' | 'breath_count';

/**
 * Flat segment structure used by both spoken and action_pause segments.
 * - spoken:       start/end = char indices; action may be 'none' or a cue;
 *                 breath_count sets inhaleCounts/holdCounts/exhaleCounts.
 * - action_pause: start=0, end=0; action ≠ 'none' and ≠ 'breath_count';
 *                 secondsHint is a hint (server finalises).
 */
interface PlanSegment {
  type:          'spoken' | 'action_pause';
  start:         number;
  end:           number;
  tag:           SegmentTag;
  action:        ActionType;
  secondsHint:   number;
  inhaleCounts:  number;
  holdCounts:    number;
  exhaleCounts:  number;
}

interface SessionPrefs {
  silencePreference?: 'minimal' | 'moderate' | 'generous';
  experienceLevel?:   'beginner' | 'intermediate' | 'advanced';
  tone?:              'warm' | 'clinical' | 'poetic';
  alertness?:         'low' | 'medium' | 'high';
}

// ─── Validation constants ─────────────────────────────────────────────────────

const VALID_GOALS     = ['Focus & Clarity', 'Stress Relief', 'Better Sleep', 'Energy Boost', 'Ease Anxiety'];
const VALID_AMBIENCES = ['Forest Sounds', 'Gentle Rain', 'Ocean Waves', 'Singing Bowls', 'Pure Silence'];
const VALID_POSTURES  = ['Seated', 'Lying Down', 'Walking', 'Standing'];
const VALID_STYLES    = ['Breath Anchor', 'Body Scan', 'Open Monitoring', 'Grounding Senses', 'Loving-Kindness', 'Wind-Down'];

function countWords(t: string): number { return t.trim().split(/\s+/).filter(Boolean).length; }

// ─── Deterministic speed mapping ──────────────────────────────────────────────

const BASE_SPEED: Record<SegmentTag, number> = {
  opening: 0.94, grounding: 0.94, breath: 0.91, body_scan: 0.87, main: 0.95, closing: 0.91,
};
const GOAL_SPEED_DELTA: Record<string, number> = { 'Better Sleep': -0.03, 'Energy Boost': 0.02 };

function computeSpeed(tag: SegmentTag, goal: string): number {
  return Math.max(0.25, Math.min(4.0, (BASE_SPEED[tag] ?? 0.93) + (GOAL_SPEED_DELTA[goal] ?? 0)));
}

// ─── Action-linked silence durations ─────────────────────────────────────────

function actionSilenceSecs(action: ActionType, goal: string): number {
  const sleep  = goal === 'Better Sleep';
  const energy = goal === 'Energy Boost';
  switch (action) {
    case 'take_2_breaths':       return sleep ? 12 : energy ? 8  : 10;
    case 'rest_here':            return sleep ? 12 : energy ? 8  : 10;
    case 'notice_feel':          return sleep ? 8  : energy ? 6  : 7;
    case 'soften_release':       return sleep ? 6  : energy ? 4  : 5;
    case 'body_scan_transition': return sleep ? 5  : energy ? 2.5 : 3.5;
    default:                     return 4;
  }
}

// ─── PASS 1: generate continuous human-sounding prose ─────────────────────────

const STYLE_GUIDANCE: Record<string, string> = {
  'Breath Anchor':    'Method — Breath Anchor: use the breath as the single primary anchor throughout. Structure: grounded arrival → introduce breath as anchor → sustained breath-attention with 2–3 "notice the mind has wandered, gently return" moments → deepening breath awareness → close. Do NOT include a body scan.',
  'Body Scan':        'Method — Body Scan: guide progressive systematic attention through body regions. Structure: grounded arrival → brief breath settles → feet/calves → thighs/pelvis → belly/low back → chest/upper back → shoulders/arms/hands → neck/throat → face/head → whole-body awareness → close. Use body_scan_transition pauses between regions.',
  'Open Monitoring':  'Method — Open Monitoring: non-reactive panoramic awareness of whatever arises — sounds, sensations, thoughts — without fixing on any single object. Structure: arrival → release effort to control attention → sounds arise and pass → sensations arise and pass → thoughts as passing clouds → rest in open spacious awareness → close. No counted breath cycles; use the breath only as initial anchor before opening out.',
  'Grounding Senses': 'Method — Grounding Senses: 5-sense grounding anchored firmly in the present. Structure: arrival → 5 physical sensations you can feel right now (temperature, pressure, texture…) → 4 sounds you can hear → 3 breath-related sensations → 2 smells or tastes (real or imagined) → 1 thing to appreciate → close. Language must be concrete and present-moment.',
  'Loving-Kindness':  'Method — Loving-Kindness (Metta): cultivate goodwill and warmth beginning with the self, expanding outward. Structure: arrival → settle into the heart area → loving-kindness phrases for self ("may I be at ease…", "may I be free from struggle…") → extend to a loved one with the same phrases → extend to a neutral person → extend to all beings everywhere → close. Phrases should be simple and sincere.',
  'Wind-Down':        'Method — Wind-Down: gentle progressive decompression toward deep rest. Structure: arrival ("the day is complete; there is nothing more required of you now") → deliberate heaviness and release of the body → slow extended exhale breath → progressive release from head to toes → mental quieting ("let each thought drift…") → trail off softly into rest. Sentences shorten and slow markedly toward the end.',
};

function buildScriptPrompt(goal: string, ambience: string, posture: string, totalSeconds: number, style = 'Breath Anchor', preferenceNotes = '', prefs: SessionPrefs = {}, wordBoostFraction = 0): string {
  const mins        = Math.round(totalSeconds / 60);
  const targetWords = Math.round(totalSeconds * 0.80 / 60 * 120 * (1 + wordBoostFraction)); // 80% spoken at 120 WPM

  const goalGuidance: Record<string, string> = {
    'Focus & Clarity': 'Goal modifier: sharpen attention and mental clarity. Breath counts: 4-hold-4 ("breathe in for four, hold for four, breathe out for four").',
    'Stress Relief':   'Goal modifier: permission to release and soften. Breath counts: extended exhale ("breathe in for four, breathe out for six"). Invite the body to let go.',
    'Better Sleep':    `Goal modifier: dissolve wakefulness into rest. Breath counts: long exhale ("breathe in for four, breathe out for eight"). Sentences should slow and shorten toward the end.`,
    'Energy Boost':    'Goal modifier: awaken and invigorate. Breath counts: energising hold ("breathe in for four, hold for four, breathe out for four"). Keep tone clear and forward-moving.',
    'Ease Anxiety':    `Goal modifier: safety and grounding. Breath counts: slow extended exhale ("breathe in for four, hold for seven, breathe out for eight"). Open language: "you are safe right now".`,
  };
  const postureNote: Record<string, string> = {
    'Seated':     'Listener is seated — reference sitting bones, hands in lap, spine lengthening.',
    'Lying Down': 'Listener is lying down — reference back releasing into floor, arms soft, palms open.',
    'Walking':    'Listener is walking slowly — reference rhythm of steps, feel of ground, gentle arm swing.',
    'Standing':   'Listener is standing — reference feet hip-width, weight through soles, crown lifting.',
  };
  const ambienceNote: Record<string, string> = {
    'Forest Sounds': 'Background: forest sounds. Briefly acknowledge the soundscape as an anchor.',
    'Gentle Rain':   'Background: rain. Invite listener to let the rain carry them deeper.',
    'Ocean Waves':   'Background: ocean. Weave wave rhythm into the breath metaphor.',
    'Singing Bowls': 'Background: singing bowls. Invite them to ride the resonance into stillness.',
    'Pure Silence':  'No background sound — do not reference any soundscape.',
  };

  const sleepNote    = goal === 'Better Sleep'              ? '\n- Sentences should slow, shorten, and trail toward the end.' : '';
  const energyNote   = goal === 'Energy Boost'              ? '\n- Voice should feel clear and forward-moving, not languid.' : '';
  const beginnerNote = prefs.experienceLevel === 'beginner' ? '\n- Beginner: briefly explain each technique before doing it.' : '';
  const advancedNote = prefs.experienceLevel === 'advanced' ? '\n- Advanced: skip technique explanations; invite deeper observation directly.' : '';
  const prefNote     = preferenceNotes                      ? `\n- Participant preference (soft guidance): "${preferenceNotes}"` : '';

  return `You are an expert meditation guide recording a ${mins}-minute audio session.

Session:
- Goal: ${goal}
- Style: ${style}
- Background: ${ambience}
- Posture: ${posture}

${STYLE_GUIDANCE[style] ?? ''}
${goalGuidance[goal] ?? ''}
${postureNote[posture] ?? ''}
${ambienceNote[ambience] ?? ''}

Write a CONTINUOUS SPOKEN SCRIPT — exactly what the guide says aloud, as flowing prose.

Rules:
- Second person ("you", "your") throughout; natural contractions ("let's", "you'll", "there's")
- Permission language: "allow yourself to…", "you might notice…", "if it feels right…"
- Avoid clichés: no "journey", "happy place", "breathe in peace breathe out stress"
- Sentences: short to medium (~8–16 words); one instruction per sentence maximum
- Specific body awareness: name muscles, sensations ("the back of your hands heavy in your lap")
- Use "…" for natural micro-pauses WITHIN sentences (e.g. "take a full breath in… and let it go.")
  Do NOT write [pause] or [silence] markers — those are added later.
- For counted breathing: describe the count in words only ("breathe in for a count of four, hold for four, breathe out for six"). Do NOT write the numbers one by one — those are generated separately.
- Target approximately ${targetWords} words${sleepNote}${energyNote}${beginnerNote}${advancedNote}${prefNote}

Output the spoken script ONLY. No headers, no JSON, no timestamps.`;
}

async function generateMeditationScript(goal: string, ambience: string, posture: string, totalSeconds: number, style = 'Breath Anchor', preferenceNotes = '', prefs: SessionPrefs = {}, wordBoostFraction = 0): Promise<string> {
  const res = await client.chat.completions.create({
    model:       'gpt-4o',
    messages:    [{ role: 'user', content: buildScriptPrompt(goal, ambience, posture, totalSeconds, style, preferenceNotes, prefs, wordBoostFraction) }],
    temperature: 0.75,
  });
  return res.choices[0].message.content?.trim() ?? '';
}

// ─── PASS 2: tag into index-based performance plan ────────────────────────────

const PASS2_SCHEMA = {
  type: 'object',
  properties: {
    segments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type:         { type: 'string', enum: ['spoken', 'action_pause'] },
          start:        { type: 'integer' },
          end:          { type: 'integer' },
          tag:          { type: 'string', enum: ['opening', 'grounding', 'breath', 'body_scan', 'main', 'closing'] },
          action:       { type: 'string', enum: ['none', 'take_2_breaths', 'rest_here', 'notice_feel', 'soften_release', 'body_scan_transition', 'breath_count'] },
          secondsHint:  { type: 'number' },
          inhaleCounts: { type: 'integer' },
          holdCounts:   { type: 'integer' },
          exhaleCounts: { type: 'integer' },
        },
        required: ['type', 'start', 'end', 'tag', 'action', 'secondsHint', 'inhaleCounts', 'holdCounts', 'exhaleCounts'],
        additionalProperties: false,
      },
    },
  },
  required: ['segments'],
  additionalProperties: false,
};

function annotateWithPositions(script: string, interval = 80): string {
  let out = '';
  for (let i = 0; i < script.length; i++) {
    if (i % interval === 0) out += `⟦${i}⟧`;
    out += script[i];
  }
  return out + `⟦${script.length}⟧`;
}

function buildTaggingPrompt(scriptText: string, goal: string, ambience: string, posture: string, totalSeconds: number, _prefs: SessionPrefs = {}): string {
  const mins      = Math.round(totalSeconds / 60);
  const scriptLen = scriptText.length;

  const sleepNote  = goal === 'Better Sleep'  ? '\n- Sleep: action_pause durations ~20% longer than stated.' : '';
  const energyNote = goal === 'Energy Boost'  ? '\n- Energy: action_pause durations at the shorter end.' : '';

  return `You are a meditation audio engineer. Segment the following script into a performance plan for TTS rendering.

Session: ${goal}, ${mins} min, ${posture}, ${ambience}
Target total: ${totalSeconds}s

ANNOTATED SCRIPT (⟦N⟧ = character position N in the original):
---
${annotateWithPositions(scriptText)}
---

OUTPUT: An ordered array of segments. Two types:

━━ SPOKEN segments ━━
- "start"/"end": character indices into the ORIGINAL script (use ⟦N⟧ anchors).
  scriptText.slice(start, end) is the exact spoken text.
- "tag": opening | grounding | breath | body_scan | main | closing
- "action": what instruction this segment ends with (or "none"):
    take_2_breaths     → spoken ends with a "take two slow breaths" cue
    rest_here          → spoken ends with "rest here" / "stay with this"
    notice_feel        → spoken ends with "notice how that feels"
    soften_release     → spoken ends with "soften your X" / "let X release"
    body_scan_transition → spoken ends with instruction to move to next body region
    breath_count       → spoken contains a counted breath cycle instruction
                         (e.g. "breathe in for a count of four…"); set inhaleCounts/holdCounts/exhaleCounts
    none               → no action cue at the end
- "secondsHint": 0 (server finalises pause durations independently)
- "inhaleCounts", "holdCounts", "exhaleCounts": counts only if action=breath_count; else 0

━━ ACTION_PAUSE segments ━━
- "start"=0, "end"=0
- "action": one of take_2_breaths | rest_here | notice_feel | soften_release | body_scan_transition
  (NOT breath_count — counting is rendered directly after the spoken segment, no pause needed)
- "secondsHint": your estimate in seconds (server will override with its own table)
- "tag": same tag as the preceding spoken segment
- "inhaleCounts"=0, "holdCounts"=0, "exhaleCounts"=0

RULES:

Coverage: spoken segments must be contiguous and cover the ENTIRE script.
  - First spoken: start=0
  - Each spoken segment: start = previous spoken segment's end (no gaps)
  - Last spoken: end=${scriptLen}

Boundaries: cut ONLY at sentence ends (.?!), or ;:, or commas if needed. NEVER mid-sentence.
  (The server will snap any imprecise boundary to the nearest safe punctuation.)

Sequence: after a spoken segment with action X (except breath_count), insert an action_pause with action X.
  After breath_count, do NOT insert an action_pause.

Silence budget: total action_pause count: 2–5. Do not insert pauses after every segment.
  Opening action_pause (before first spoken): 0.5–1.0s max secondsHint, tag=opening.

Body scan: for body_scan sections, you MAY split into 2–4 spoken sub-segments with body_scan_transition
  pauses between regions (each spoken sub-segment still ≥15 seconds of speech).${sleepNote}${energyNote}

Return JSON only.`;
}

function validateAndFixSegments(segs: PlanSegment[], script: string): { segments: PlanSegment[]; warnings: string[] } {
  const warnings: string[] = [];
  const fixed = segs.map(s => ({ ...s }));
  const len   = script.length;

  for (const s of fixed) {
    if (s.type === 'spoken') {
      s.start = Math.max(0, Math.min(len, s.start ?? 0));
      s.end   = Math.max(s.start, Math.min(len, s.end ?? 0));
      // silence_seconds not in new schema; secondsHint = 0 for spoken
    } else {
      s.start = 0; s.end = 0;
      if (!s.secondsHint || s.secondsHint <= 0) s.secondsHint = 5;
    }
  }

  const spoken = fixed.filter(s => s.type === 'spoken' && s.start < s.end);
  if (spoken.length === 0) {
    warnings.push('No valid spoken segments — using full script as single segment');
    fixed.push({ type: 'spoken', start: 0, end: len, tag: 'main', action: 'none', secondsHint: 0, inhaleCounts: 0, holdCounts: 0, exhaleCounts: 0 });
  } else {
    if (spoken[0].start > 0) { warnings.push(`First spoken starts at ${spoken[0].start}; fixing to 0`); spoken[0].start = 0; }
    const last = spoken[spoken.length - 1];
    if (last.end < len) { warnings.push(`Last spoken ends at ${last.end}; fixing to ${len}`); last.end = len; }
  }

  return { segments: fixed, warnings };
}

async function tagScriptToPlan(scriptText: string, goal: string, ambience: string, posture: string, totalSeconds: number, prefs: SessionPrefs = {}): Promise<{ segments: PlanSegment[]; warnings: string[] }> {
  const res = await client.chat.completions.create({
    model:    'gpt-4o',
    messages: [{ role: 'user', content: buildTaggingPrompt(scriptText, goal, ambience, posture, totalSeconds, prefs) }],
    response_format: { type: 'json_schema', json_schema: { name: 'meditation_plan', strict: true, schema: PASS2_SCHEMA as Record<string, unknown> } },
  });
  const parsed = JSON.parse(res.choices[0].message.content ?? '{"segments":[]}') as { segments: PlanSegment[] };
  return validateAndFixSegments(parsed.segments, scriptText);
}

// ─── Boundary snapper ─────────────────────────────────────────────────────────

/**
 * Snap a character position to the nearest safe punctuation boundary within ±window chars.
 * Preference: .?! > ;: > , > whitespace.
 * Handles closing quotes (", ', ", ') after punctuation — looks one char back when needed.
 * Never mid-word.
 */
function snapBoundary(script: string, pos: number, window = 40): number {
  if (pos <= 0 || pos >= script.length) return pos;

  let best = -1, bestScore = -1;
  const lo = Math.max(1, pos - window);
  const hi = Math.min(script.length, pos + window);

  for (let i = lo; i <= hi; i++) {
    const curr = i < script.length ? script[i] : '';

    // A boundary is only valid if what follows the cut is whitespace, newline, end-of-string,
    // or a closing quote optionally followed by whitespace/newline.
    const followOk = i >= script.length
      || /[\s\n]/.test(curr)
      || (/['"'"\u2019\u201D]/.test(curr) && (i + 1 >= script.length || /[\s\n]/.test(script[i + 1])));
    if (!followOk) continue;

    // Find punctuation: check script[i-1] directly, or look through a closing quote to script[i-2]
    let punctChar = '';
    if (i >= 1) {
      const c1 = script[i - 1];
      if (/[.?!;:,]/.test(c1)) {
        punctChar = c1;
      } else if (/['"'"\u2019\u201D]/.test(c1) && i >= 2 && /[.?!;:,]/.test(script[i - 2])) {
        punctChar = script[i - 2]; // e.g. ." or .'
      }
    }
    if (!punctChar) continue;

    let typeScore = 0;
    if (/[.?!]/.test(punctChar))  typeScore = 300;
    else if (/[;:]/.test(punctChar)) typeScore = 200;
    else if (/[,]/.test(punctChar))  typeScore = 100;

    const total = typeScore + (window - Math.abs(i - pos));
    if (total > bestScore) { bestScore = total; best = i; }
  }

  if (best >= 0) return best;

  // Fallback: nearest whitespace boundary
  for (let d = 0; d <= window; d++) {
    if (pos + d < script.length && /\s/.test(script[pos + d])) return pos + d + 1;
    if (pos - d > 0             && /\s/.test(script[pos - d])) return pos - d + 1;
  }
  return pos;
}

/** Snap all internal spoken-segment boundaries to safe punctuation. */
function snapAllBoundaries(segments: PlanSegment[], script: string): PlanSegment[] {
  const result = segments.map(s => ({ ...s }));
  const spokenIdx = result.map((s, i) => s.type === 'spoken' ? i : -1).filter(i => i >= 0);

  for (let k = 0; k + 1 < spokenIdx.length; k++) {
    const a = result[spokenIdx[k]];
    const b = result[spokenIdx[k + 1]];
    const raw     = a.end;
    const snapped = snapBoundary(script, raw);
    if (snapped !== raw) {
      console.log(`[snap] Boundary ${raw} → ${snapped} (between spoken segments ${spokenIdx[k]} and ${spokenIdx[k + 1]}: "…${script.slice(Math.max(0, snapped - 20), snapped).replace(/\n/g, ' ')}")`);
    }
    a.end   = snapped;
    b.start = snapped;
  }
  return result;
}

// ─── TTS rendering helpers ────────────────────────────────────────────────────

async function renderTTS(text: string, speed: number): Promise<Buffer> {
  const res = await client.audio.speech.create(
    { model: TTS_MODEL, voice: TTS_VOICE, input: text, response_format: 'pcm', speed },
    { timeout: 90_000 }
  );
  return Buffer.from(await res.arrayBuffer());
}

const COUNT_WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/**
 * Deterministic breath count with tuned cadence.
 *
 * Each spoken number word is ~0.25s at these speeds, so:
 *   COUNT_GAP = 0.65s  →  word + gap ≈ 0.9s per beat  (feels like a ~1s hold)
 *   CUE_GAP   = 0.15s  →  brief breath after "Breathe in / out / Hold"
 *   FINAL_GAP = 0.15s  →  very short tail after the last exhale count (no long dead air)
 *
 * Pattern: "Breathe in" [0.15s] one [0.65s] two [0.65s] … N [0.65s]
 *           ("Hold" [0.15s] one … N [0.65s])?
 *           "Breathe out" [0.15s] one [0.65s] … N [0.15s]
 */
async function renderBreathCount(inhaleCounts: number, holdCounts: number, exhaleCounts: number, speed: number): Promise<Buffer> {
  const COUNT_GAP  = 0.65;
  const CUE_GAP   = 0.15;
  const FINAL_GAP = 0.15;
  const MAX_N     = 10;

  type Spec = { word: string; gapAfter: number };
  const specs: Spec[] = [];

  // Inhale
  specs.push({ word: 'Breathe in', gapAfter: CUE_GAP });
  for (let i = 0; i < Math.min(inhaleCounts, MAX_N); i++)
    specs.push({ word: COUNT_WORDS[i], gapAfter: COUNT_GAP });

  // Hold (optional)
  if (holdCounts > 0) {
    specs.push({ word: 'Hold', gapAfter: CUE_GAP });
    for (let i = 0; i < Math.min(holdCounts, MAX_N); i++)
      specs.push({ word: COUNT_WORDS[i], gapAfter: COUNT_GAP });
  }

  // Exhale — last count gets the short FINAL_GAP
  specs.push({ word: 'Breathe out', gapAfter: CUE_GAP });
  const exhaleN = Math.min(exhaleCounts, MAX_N);
  for (let i = 0; i < exhaleN; i++) {
    const isLast = i === exhaleN - 1;
    specs.push({ word: COUNT_WORDS[i], gapAfter: isLast ? FINAL_GAP : COUNT_GAP });
  }

  const pcms = await Promise.all(specs.map(s => renderTTS(s.word, speed)));
  const chunks: Buffer[] = [];
  for (let i = 0; i < specs.length; i++) {
    chunks.push(applyFades(pcms[i]));
    if (specs[i].gapAfter > 0) chunks.push(silencePcm(specs[i].gapAfter));
  }
  return Buffer.concat(chunks);
}

// ─── Audio rendering ──────────────────────────────────────────────────────────

async function renderSpokenBuffers(
  segments: PlanSegment[],
  scriptText: string,
  goal: string,
  speedOverrides: Map<number, number> = new Map()
): Promise<Map<number, Buffer>> {
  const out = new Map<number, Buffer>();
  await Promise.all(
    segments.map(async (seg, i) => {
      if (seg.type !== 'spoken') return;
      const text = scriptText.slice(seg.start, seg.end);
      if (!/\S/.test(text)) return;
      const speed = speedOverrides.get(i) ?? computeSpeed(seg.tag, goal);

      const spokenPcm = applyFades(await renderTTS(text, speed));

      if (seg.action === 'breath_count' && seg.inhaleCounts > 0) {
        const countPcm = await renderBreathCount(seg.inhaleCounts, seg.holdCounts, seg.exhaleCounts, speed);
        out.set(i, Buffer.concat([spokenPcm, countPcm]));
      } else {
        out.set(i, spokenPcm);
      }
    })
  );
  return out;
}

function totalPcmSeconds(buffers: Map<number, Buffer>): number {
  let s = 0;
  for (const b of buffers.values()) s += b.length / BYTES_PER_SEC;
  return s;
}

async function renderAudio(segments: PlanSegment[], scriptText: string, totalSeconds: number, goal: string): Promise<{ wav: Buffer; remainingDrift: number; warnings: string[] }> {
  // 1. Snap spoken boundaries to safe punctuation
  const snapped = snapAllBoundaries(segments, scriptText);

  // 2. First render pass
  let spokenBuffers = await renderSpokenBuffers(snapped, scriptText, goal);
  let actualSpoken  = totalPcmSeconds(spokenBuffers);

  // Log computed speeds
  for (let i = 0; i < snapped.length; i++) {
    const s = snapped[i];
    if (s.type === 'spoken') {
      const speed = computeSpeed(s.tag, goal);
      console.log(`[speed] seg ${i} tag=${s.tag} action=${s.action} speed=${speed.toFixed(3)} chars=[${s.start},${s.end})`);
    }
  }

  // 3. Speed bump if spoken alone exceeds target
  if (actualSpoken > totalSeconds - 0.5) {
    console.warn(`[audio] Spoken ${actualSpoken.toFixed(1)}s exceeds target ${totalSeconds}s — applying speed bump to main/closing`);
    const overrides = new Map<number, number>();
    for (let i = 0; i < snapped.length; i++) {
      const s = snapped[i];
      if (s.type === 'spoken' && (s.tag === 'main' || s.tag === 'closing')) {
        overrides.set(i, Math.min(4.0, computeSpeed(s.tag, goal) + 0.03));
      }
    }
    if (overrides.size > 0) {
      // Re-render only bumped segments
      const bumped = await renderSpokenBuffers(snapped, scriptText, goal, overrides);
      for (const [k, v] of bumped) spokenBuffers.set(k, v);
      actualSpoken = totalPcmSeconds(spokenBuffers);
    }
  }

  // 4. Compute action-linked silence durations
  //    - Zero out any action_pause immediately following a breath_count spoken segment
  //      (counting audio already contains its own inter-count pauses).
  //    - Hard-cap body_scan_transition at 6s so drift can never inflate it absurdly.
  const MAX_OPENING = 1.5;
  const silenceDurs: number[] = snapped.map((seg, i) => {
    if (seg.type !== 'action_pause') return 0;

    // Suppress if the preceding spoken segment used breath_count
    let prevAction: ActionType | undefined;
    for (let j = i - 1; j >= 0; j--) {
      if (snapped[j].type === 'spoken') { prevAction = snapped[j].action; break; }
    }
    if (prevAction === 'breath_count') {
      console.log(`[audio] Suppressing action_pause seg ${i} — immediately follows breath_count`);
      return 0;
    }

    const dur = actionSilenceSecs(seg.action, goal);
    if (i === 0)                              return Math.min(MAX_OPENING, dur); // clamp opening
    if (seg.action === 'body_scan_transition') return Math.min(dur, 6.0);        // hard cap
    return dur;
  });

  const plannedSilence = silenceDurs.reduce((a, b) => a + b, 0);
  let remaining        = totalSeconds - actualSpoken - plannedSilence;
  const audioWarnings: string[] = [];

  console.log(
    `[audio] Spoken: ${actualSpoken.toFixed(1)}s | Planned silence: ${plannedSilence.toFixed(1)}s | ` +
    `Drift: ${remaining.toFixed(1)}s | Target: ${totalSeconds}s`
  );

  // 5. Distribute drift across eligible pauses, capped at MAX_SILENCE_SECONDS each.
  if (Math.abs(remaining) > 0.1) {
    // Build candidate indices in priority order (no duplicates)
    const seen = new Set<number>();
    const candidates: number[] = [];

    // Priority 1: closing tag OR rest_here — the most natural long resting moments
    for (let i = 1; i < snapped.length; i++) {
      const s = snapped[i];
      if (s.type === 'action_pause' && (s.tag === 'closing' || s.action === 'rest_here')) {
        candidates.push(i); seen.add(i);
      }
    }
    // Priority 2: any non-body_scan_transition pause (skip opening at i=0)
    for (let i = 1; i < snapped.length; i++) {
      if (seen.has(i)) continue;
      const s = snapped[i];
      if (s.type === 'action_pause' && s.action !== 'body_scan_transition') {
        candidates.push(i); seen.add(i);
      }
    }
    // Priority 3: any remaining action_pause (including body_scan_transition, fallback)
    for (let i = 1; i < snapped.length; i++) {
      if (seen.has(i)) continue;
      if (snapped[i].type === 'action_pause') { candidates.push(i); seen.add(i); }
    }

    for (const idx of candidates) {
      if (Math.abs(remaining) < 0.1) break;
      const capacity = MAX_SILENCE_SECONDS - silenceDurs[idx];
      // Adding: don't exceed MAX. Removing: don't go below 0.5s minimum.
      const add = Math.max(-(silenceDurs[idx] - 0.5), Math.min(remaining, capacity));
      if (Math.abs(add) < 0.05) continue;
      silenceDurs[idx] += add;
      remaining -= add;
      const s = snapped[idx];
      console.log(`[audio] Drift dist: seg ${idx} (${s.action}/${s.tag}) ${add >= 0 ? '+' : ''}${add.toFixed(1)}s → ${silenceDurs[idx].toFixed(1)}s | rem=${remaining.toFixed(1)}s`);
    }
  }

  const finalSilence = silenceDurs.reduce((a, b) => a + b, 0);
  console.log(`[audio] After distribution: silence=${finalSilence.toFixed(1)}s | remaining=${remaining.toFixed(1)}s`);

  // 6. Assemble PCM
  const chunks: Buffer[] = [];
  for (let i = 0; i < snapped.length; i++) {
    const seg = snapped[i];
    if (seg.type === 'spoken') {
      const pcm = spokenBuffers.get(i);
      if (pcm) chunks.push(pcm);
    } else {
      const secs = silenceDurs[i];
      if (secs > 0) chunks.push(silencePcm(secs));
    }
  }

  // Tail silence for any remaining positive drift — hard-capped at MAX_SILENCE_SECONDS
  if (remaining > 0.1) {
    const tailSecs = Math.min(remaining, MAX_SILENCE_SECONDS);
    chunks.push(silencePcm(tailSecs));
    remaining -= tailSecs;
    console.log(`[audio] Tail silence: ${tailSecs.toFixed(1)}s | remaining=${remaining.toFixed(1)}s`);
  }

  if (remaining > 5) {
    const msg = `Script ran ~${remaining.toFixed(0)}s short of target`;
    audioWarnings.push(msg);
    console.warn(`[audio] ${msg} — retry with longer script recommended`);
  }

  const pcmData = Buffer.concat(chunks);
  return {
    wav: Buffer.concat([buildWavHeader(pcmData.length), pcmData]),
    remainingDrift: remaining,
    warnings: audioWarnings,
  };
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

function cleanupOldAudio(): void {
  try {
    const now = Date.now();
    for (const f of fs.readdirSync(TMP_DIR)) {
      const fp = path.join(TMP_DIR, f);
      try { if (now - fs.statSync(fp).mtimeMs > 3_600_000) { fs.unlinkSync(fp); console.log(`[cleanup] ${f}`); } }
      catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}
setInterval(cleanupOldAudio, 30 * 60 * 1000);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Legacy text-only endpoint
const PACING_WPM = 125;
app.post('/api/generate-meditation', async (req, res) => {
  const { goal, durationSeconds, ambience, posture } = req.body;
  if (!VALID_GOALS.includes(goal))     { res.status(400).json({ error: 'Invalid goal' });     return; }
  if (!VALID_AMBIENCES.includes(ambience)) { res.status(400).json({ error: 'Invalid ambience' }); return; }
  if (!VALID_POSTURES.includes(posture))   { res.status(400).json({ error: 'Invalid posture' });  return; }
  if (typeof durationSeconds !== 'number' || durationSeconds < 180 || durationSeconds > 900)
    { res.status(400).json({ error: 'durationSeconds must be 180–900' }); return; }

  const targetWords = Math.round(PACING_WPM * (durationSeconds / 60));
  const warnings: string[] = [];
  try {
    const scriptText = await generateMeditationScript(goal, ambience, posture, durationSeconds);
    const wordCount  = countWords(scriptText);
    res.json({ scriptText, targetSeconds: durationSeconds, estimatedSeconds: Math.round((wordCount / PACING_WPM) * 60), wordCount, pacingWpm: PACING_WPM, goal, ambience, posture, warnings });
  } catch (err) {
    console.error('generateScript error:', err);
    res.status(500).json({ error: 'Failed to generate meditation script.' });
  }
  void targetWords; // suppress unused warning
});

// Plan-only endpoint
app.post('/api/generate-meditation-plan', async (req, res) => {
  const { goal, durationSeconds, ambience, posture } = req.body;
  if (!VALID_GOALS.includes(goal))         { res.status(400).json({ error: 'Invalid goal' });     return; }
  if (!VALID_AMBIENCES.includes(ambience)) { res.status(400).json({ error: 'Invalid ambience' }); return; }
  if (!VALID_POSTURES.includes(posture))   { res.status(400).json({ error: 'Invalid posture' });  return; }
  if (typeof durationSeconds !== 'number' || durationSeconds < 180 || durationSeconds > 900)
    { res.status(400).json({ error: 'durationSeconds must be 180–900' }); return; }

  const style: string          = VALID_STYLES.includes(req.body.style) ? req.body.style : 'Breath Anchor';
  const preferenceNotes: string = typeof req.body.preference_notes === 'string' ? req.body.preference_notes.trim().slice(0, 120) : '';
  const prefs: SessionPrefs    = req.body.prefs ?? {};
  try {
    const scriptText             = await generateMeditationScript(goal, ambience, posture, durationSeconds, style, preferenceNotes, prefs);
    const { segments, warnings } = await tagScriptToPlan(scriptText, goal, ambience, posture, durationSeconds, prefs);
    res.json({ scriptText, segments, totalSeconds: durationSeconds, warnings });
  } catch (err) {
    console.error('Plan error:', err);
    res.status(500).json({ error: 'Failed to generate plan.' });
  }
});

// Main audio generation endpoint (3-pass: script → tag → render)
app.post('/api/generate-meditation-audio', async (req, res) => {
  const { goal, durationSeconds, ambience, posture } = req.body;
  if (!VALID_GOALS.includes(goal))         { res.status(400).json({ error: 'Invalid goal' });     return; }
  if (!VALID_AMBIENCES.includes(ambience)) { res.status(400).json({ error: 'Invalid ambience' }); return; }
  if (!VALID_POSTURES.includes(posture))   { res.status(400).json({ error: 'Invalid posture' });  return; }
  if (typeof durationSeconds !== 'number' || durationSeconds < 180 || durationSeconds > 900)
    { res.status(400).json({ error: 'durationSeconds must be 180–900' }); return; }

  const style: string          = VALID_STYLES.includes(req.body.style) ? req.body.style : 'Breath Anchor';
  const preferenceNotes: string = typeof req.body.preference_notes === 'string' ? req.body.preference_notes.trim().slice(0, 120) : '';
  const prefs: SessionPrefs    = req.body.prefs ?? {};
  try {
    // Pass 1 — continuous human-sounding prose
    console.log(`[gen] Pass 1: ${goal}, ${style}, ${durationSeconds}s`);
    let scriptText = await generateMeditationScript(goal, ambience, posture, durationSeconds, style, preferenceNotes, prefs);
    console.log(`[gen] Pass 1 done: ${countWords(scriptText)} words, ${scriptText.length} chars`);

    // Pass 2 — tag into index-based performance plan
    console.log(`[gen] Pass 2: tagging`);
    let { segments, warnings } = await tagScriptToPlan(scriptText, goal, ambience, posture, durationSeconds, prefs);
    for (const w of warnings) console.warn(`[gen] ${w}`);
    console.log(`[gen] Pass 2 done: ${segments.length} segments`);

    // Pass 3 — snap boundaries + render
    console.log(`[gen] Pass 3: rendering`);
    let audioResult = await renderAudio(segments, scriptText, durationSeconds, goal);
    warnings.push(...audioResult.warnings);

    // Retry Pass 1 with +15% words if script was too short to fill the target duration
    if (audioResult.remainingDrift > 40) {
      console.warn(`[gen] Remaining drift ${audioResult.remainingDrift.toFixed(1)}s > 40s — retrying Pass 1 with +15% words`);
      warnings.push(`Retried: script was ~${audioResult.remainingDrift.toFixed(0)}s short of target`);
      scriptText = await generateMeditationScript(goal, ambience, posture, durationSeconds, style, preferenceNotes, prefs, 0.15);
      console.log(`[gen] Retry Pass 1 done: ${countWords(scriptText)} words`);
      const retry2 = await tagScriptToPlan(scriptText, goal, ambience, posture, durationSeconds, prefs);
      segments = retry2.segments;
      warnings.push(...retry2.warnings);
      audioResult = await renderAudio(segments, scriptText, durationSeconds, goal);
      warnings.push(...audioResult.warnings);
    }

    const wavBuffer = audioResult.wav;
    const id = randomUUID();
    fs.writeFileSync(path.join(TMP_DIR, `${id}.wav`), wavBuffer);
    console.log(`[gen] Saved ${(wavBuffer.length / 1e6).toFixed(1)} MB → ${id}.wav`);

    const wordCount     = countWords(scriptText);
    const actualSeconds = (wavBuffer.length - 44) / BYTES_PER_SEC;
    res.json({
      audioUrl: `/api/audio/${id}`, scriptText,
      targetSeconds: durationSeconds, estimatedSeconds: Math.round(actualSeconds),
      wordCount, pacingWpm: Math.round(wordCount / (actualSeconds / 60)),
      goal, ambience, posture, warnings,
    });
  } catch (err) {
    console.error('Audio generation error:', err);
    res.status(500).json({ error: 'Failed to generate meditation audio. Please try again.' });
  }
});

// Serve audio with range request support
app.get('/api/audio/:id', (req, res) => {
  const id = req.params.id;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))
    { res.status(400).send('Invalid audio ID'); return; }

  const fp = path.join(TMP_DIR, `${id}.wav`);
  if (!fs.existsSync(fp)) { res.status(404).send('Audio not found or expired'); return; }

  const fileSize = fs.statSync(fp).size;
  const range    = req.headers.range;
  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'no-store');

  if (range) {
    const [s, e]    = range.replace(/bytes=/, '').split('-');
    const start     = parseInt(s, 10);
    const end       = e ? parseInt(e, 10) : fileSize - 1;
    res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${fileSize}`, 'Content-Length': end - start + 1 });
    fs.createReadStream(fp, { start, end }).pipe(res);
  } else {
    res.setHeader('Content-Length', fileSize);
    res.status(200);
    fs.createReadStream(fp).pipe(res);
  }
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`Meditation server running on http://localhost:${PORT}`));
