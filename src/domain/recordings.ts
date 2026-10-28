// Picking which recording to play. Courses publish real recordings now
// (backend PR #8): every exercise carries promptAudio/answerAudio and every
// lexeme its word-only takes, each an AudioMap of voice id -> takes. Which
// voice to play follows audio.json's rules: a line with a speaker plays one of
// that speaker's voices, anything else the learner's preferred voice, falling
// back to the course's default (audio.json's first voice). Text-to-speech
// (domain/tts.ts) is only for what has no recording at all.
import { stripReadingAids } from "./persian/normalize";
import { parseLexemeTag } from "./lexemeTag";
import type { AudioMap, LexemeIndex } from "../types/content";

export interface VoiceChoice {
  /** user_prefs.preferred_voice — null means the course default. */
  preferredVoice: string | null;
  /** audio.json's first voice, or null before it has loaded (or on a course with no audio.json). */
  defaultVoice: string | null;
  /** The line's speaker's voices (audio.json `speakers`), when it has a speaker. Empty means any voice. */
  speakerVoices?: readonly string[] | null;
}

/**
 * FNV-1a, finished with murmur3's fmix32. The finisher matters: FNV-1a's low
 * bit is only the parity of the input's characters, so `% 2` over two voices
 * would land every similar key on the same voice.
 */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** One of `voices`, drawn by `seed` and `key` — sorted first, so the draw doesn't depend on the order they were listed in. Null when there are none. */
export function drawVoice(voices: Iterable<string>, seed: number, key: string): string | null {
  const pool = [...new Set(voices)].sort();
  return pool.length > 0 ? pool[hash(`${seed}:${key}`) % pool.length] : null;
}

function recordedVoices(audio: AudioMap | null | undefined): string[] {
  return audio ? Object.keys(audio).filter((voice) => audio[voice]?.[0]) : [];
}

/** Whether any voice recorded this line at all. */
export function hasRecording(audio: AudioMap | null | undefined): boolean {
  return recordedVoices(audio).length > 0;
}

/**
 * False for a listening exercise whose prompt has no recording: there is
 * nothing to hear and its text must not stand in for it. A lesson holding one is
 * declined; repacks and practice leave it out.
 */
export function isPlayable(exercise: { type: string; promptAudio?: AudioMap | null }): boolean {
  return exercise.type !== "listen_type" || hasRecording(exercise.promptAudio);
}

/** The first non-empty tier's draw. */
function drawFromTiers(tiers: readonly (readonly string[])[], seed: number, key: string): string | null {
  const tier = tiers.find((voices) => voices.length > 0);
  return tier ? drawVoice(tier, seed, key) : null;
}

/** The parts of an exercise its shuffled voice is drawn from. */
export interface ShuffleExercise {
  prompt: string;
  answer: readonly string[];
  promptAudio?: AudioMap | null;
  answerAudio?: AudioMap | null;
  speaker?: string | null;
}

/**
 * With voices shuffled (localAppPrefs' shuffleVoices), the voice a whole
 * exercise plays in — its prompt, its answer, its word-bank tiles and hovered
 * words alike — so a question keeps one voice and the next question may get
 * another. Drawn from the voices that recorded both its prompt and its
 * answer, else either, else the whole `cast`; a line with a speaker draws
 * only among that speaker's voices. The exercise has no id, so its prompt and
 * first answer stand in for one: a requeued question keeps its voice for as
 * long as the seed lasts. Android draws the same way (features.yaml's
 * shuffle-voices).
 */
export function exerciseVoice(
  exercise: ShuffleExercise,
  cast: readonly string[],
  speakerVoices: readonly string[] | null | undefined,
  seed: number,
): string | null {
  const own = speakerVoices && speakerVoices.length > 0 ? speakerVoices : null;
  const allowed = (voice: string) => !own || own.includes(voice);
  const prompt = recordedVoices(exercise.promptAudio);
  const answer = recordedVoices(exercise.answerAudio);
  return drawFromTiers(
    [
      prompt.filter((voice) => answer.includes(voice) && allowed(voice)),
      [...prompt, ...answer].filter(allowed),
      own ?? cast,
    ],
    seed,
    `${exercise.prompt}\n${exercise.answer[0] ?? ""}`,
  );
}

/** The same outside any exercise (a story line, a saved word's audio button): one recording's own draw, keyed by its takes. */
export function lineVoice(audio: AudioMap | null | undefined, speakerVoices: readonly string[] | null | undefined, seed: number): string | null {
  const recorded = recordedVoices(audio);
  const key = recorded.map((voice) => audio![voice][0]).sort().join("|");
  return drawFromTiers([recorded.filter((voice) => speakerVoices?.includes(voice)), recorded], seed, key);
}

/**
 * The path of the take to play, relative to the version root, or null when
 * nothing usable is recorded. Always a voice's FIRST take — the one the
 * publisher says to play when the client doesn't pick.
 */
export function pickRecording(audio: AudioMap | null | undefined, choice: VoiceChoice): string | null {
  if (!audio) return null;
  const takeOf = (voice: string | null | undefined) => (voice ? (audio[voice]?.[0] ?? null) : null);

  const speakerVoices = choice.speakerVoices ?? [];
  if (speakerVoices.length > 0) {
    if (choice.preferredVoice && speakerVoices.includes(choice.preferredVoice)) {
      const preferred = takeOf(choice.preferredVoice);
      if (preferred) return preferred;
    }
    for (const voice of speakerVoices) {
      const take = takeOf(voice);
      if (take) return take;
    }
  }

  return takeOf(choice.preferredVoice) ?? takeOf(choice.defaultVoice) ?? Object.values(audio).find((takes) => takes.length > 0)?.[0] ?? null;
}

/** Spelling compared without reading aids, so a vowel-marked tile (کِتاب) still finds its lexeme (کتاب). */
function sameWord(a: string, b: string): boolean {
  return a === b || stripReadingAids(a) === stripReadingAids(b);
}

/**
 * The recording of one word as it's written on screen — a word-bank tile —
 * or null. The exercise's own tags are tried before the rest of the course's
 * lexemes, so a homograph resolves to the sense this exercise is about; a
 * distractor tile, which no tag names, is found course-wide. A tile with
 * endings attached (مادرم) is no lexeme's spelling, so it has no recording and
 * the caller reads it with text-to-speech instead.
 */
export function wordRecording(
  text: string,
  exerciseTags: readonly string[],
  lexemeIndex: LexemeIndex | null | undefined,
  choice: VoiceChoice,
): string | null {
  if (!lexemeIndex) return null;
  const word = text.trim();
  if (!word) return null;

  const candidates = [...exerciseTags, ...Object.keys(lexemeIndex)];
  for (const tag of candidates) {
    const entry = lexemeIndex[tag];
    if (!entry?.audio) continue;
    const spellings = [parseLexemeTag(tag).surface, ...(entry.forms ?? [])];
    if (!spellings.some((spelling) => sameWord(spelling, word))) continue;
    const recording = pickRecording(entry.audio, choice);
    if (recording) return recording;
  }
  return null;
}
