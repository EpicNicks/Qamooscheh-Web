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
