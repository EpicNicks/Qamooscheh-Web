// Course-wide native word -> romanization, derived straight from lexemes.json's
// own tag format (Qamooscheh.Content.Source.LexemeSource: tag is always
// "<surface><pos>[<register>]", e.g. "سلام<interj><spoken>" -> gloss "hello").
// The surface text before the first "<" IS the literal word every tile/prompt
// renders, so no per-exercise alignment against `tags`/`answer` is needed at
// all: any native word anywhere in the course (a word-bank tile — including a
// decoy borrowed from another exercise — or a prompt written in the target
// language) gets its romanization the moment its lexeme has one, regardless of
// which exercise's own `tags` list happens to reference it. Built once per
// lexemeIndex fetch and reused across every exercise on screen.
import type { LexemeIndex } from "../types/content";
import type { ExerciseScriptMode, ScriptMode } from "./enums";

export function buildLexemeRomanizationMap(lexemeIndex: LexemeIndex | null | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!lexemeIndex) return map;
  for (const [tag, entry] of Object.entries(lexemeIndex)) {
    if (!entry.romanization) continue;
    const surface = tag.split("<", 1)[0];
    if (surface) map.set(surface, entry.romanization);
  }
  return map;
}

/** Shared empty instance for "hints are off/not applicable right now" — avoids allocating a fresh Map every render just to disable the feature. */
export const EMPTY_ROMANIZATION_MAP: ReadonlyMap<string, string> = new Map();

/**
 * Whether the course-wide romanization map should actually be handed to
 * this exercise's components, or the shared empty one instead — three
 * independent reasons to hide it: the learner's local "hover a word" toggle
 * is off, their own scriptMode preference is "romanized" (they've chosen to
 * read Latin text, so a Latin-hint over already-native text is redundant —
 * see user_prefs.script_mode's "native"|"romanized"|"both"), or this
 * specific exercise's own scriptMode isn't "native" (a "romanized"-authored
 * exercise's own tiles/prompt are already Latin — ExerciseArtifact's own
 * doc). Centralized here so every page gates the same way instead of each
 * re-deriving the three-condition check.
 */
export function gateRomanizationMap(
  courseMap: ReadonlyMap<string, string>,
  opts: { hintsEnabled: boolean; scriptModePref: ScriptMode | undefined; exerciseScriptMode: ExerciseScriptMode },
): ReadonlyMap<string, string> {
  if (!opts.hintsEnabled || opts.scriptModePref === "romanized" || opts.exerciseScriptMode !== "native") {
    return EMPTY_ROMANIZATION_MAP;
  }
  return courseMap;
}
