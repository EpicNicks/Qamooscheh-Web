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
  /**
   * Set when the learner shuffles voices (localAppPrefs' shuffleVoices): each
   * line plays a voice drawn from those that recorded it, instead of the
   * preferred one. The draw hashes this seed with the line's own takes, so a
   * line keeps its voice for as long as the seed lasts (every replay, and the
   * take an exercise report cites, agree) while different lines spread across
   * the cast.
   */
  shuffleSeed?: number | null;
}

/**
 * FNV-1a, finished with murmur3's fmix32. The finisher matters: FNV-1a's low
 * bit is only the parity of the input's characters, so `% 2` over two voices
 * would give every line with the same digits the same voice.
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

/** The shuffled voice's take: one of `voices` that recorded the line, picked by the seed. Null when none of them did. */
function shuffledTake(audio: AudioMap, voices: readonly string[], seed: number): string | null {
  const recorded = [...new Set(voices)].filter((voice) => audio[voice]?.[0]).sort();
  if (recorded.length === 0) return null;
  const key = recorded.map((voice) => audio[voice][0]).join("|");
  return audio[recorded[hash(`${seed}:${key}`) % recorded.length]][0];
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
  if (choice.shuffleSeed != null) {
    // A speaker's line still stays in that character's voices; only which of them is drawn.
    const shuffled =
      (speakerVoices.length > 0 ? shuffledTake(audio, speakerVoices, choice.shuffleSeed) : null) ??
      shuffledTake(audio, Object.keys(audio), choice.shuffleSeed);
    if (shuffled) return shuffled;
  }
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
