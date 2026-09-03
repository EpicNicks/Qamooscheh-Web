// Course-wide native word -> hover hint, derived straight from lexemes.json's
// own tag format (Qamooscheh.Content.Source.LexemeSource: tag is always
// "<surface><pos>[<register>]", e.g. "سلام<interj><spoken>" -> gloss "hello").
// The surface text before the first "<" IS the literal word every tile/prompt
// renders, so no per-exercise alignment against `tags`/`answer` is needed at
// all: any native word anywhere in the course (a word-bank tile — including a
// decoy borrowed from another exercise — or a prompt written in the target
// language) gets its hint the moment its lexeme exists, regardless of which
// exercise's own `tags` list happens to reference it. Built once per
// lexemeIndex fetch and reused across every exercise on screen.
import type { LexemeIndex } from "../types/content";
import type { ExerciseScriptMode, ScriptMode } from "./enums";

/** What a hovered/focused word can offer — its meaning and, when the source lexeme has one, a phonetic reading. Which of the two actually renders is up to the viewing component's own HintSettings, not this data. */
export interface WordHint {
  translation: string;
  romanization: string | null;
}

export function buildLexemeHintMap(lexemeIndex: LexemeIndex | null | undefined): Map<string, WordHint> {
  const map = new Map<string, WordHint>();
  if (!lexemeIndex) return map;
  for (const [tag, entry] of Object.entries(lexemeIndex)) {
    const surface = tag.split("<", 1)[0];
    if (!surface) continue;
    // Two lexemes can share a surface (the same word tagged as a noun and a
    // verb, or in two registers) — merge onto whatever's already there
    // instead of last-write-wins overwriting, so a homograph missing a
    // romanization can never clobber a sibling entry that has one.
    const existing = map.get(surface);
    map.set(surface, {
      translation: existing?.translation ?? entry.gloss,
      romanization: existing?.romanization ?? entry.romanization,
    });
  }
  return map;
}

/** Shared empty instance for "hints are off/not applicable right now" — avoids allocating a fresh Map every render just to disable the feature. */
export const EMPTY_HINT_MAP: ReadonlyMap<string, WordHint> = new Map();

/** Shared "nothing enabled" instance for components whose caller omitted `HintSettings` entirely — kept beside EMPTY_HINT_MAP since the two defaults are a matched pair (an empty map with settings enabled, or vice versa, would still correctly show nothing, but every component here defaults both together). */
export const NO_HINTS: HintSettings = { translationEnabled: false, romanizationEnabled: false };

/**
 * Which of a word's two possible hints (translation, phonetic reading) a
 * hovered word should actually offer — the learner's two independent local
 * toggles (hooks/useShowTranslationHints.ts, hooks/useShowRomanizationHints.ts).
 * Threaded down to RomanizedWord/RomanizedText alongside the hint map itself
 * so the tooltip-assembly logic in components/lesson/RomanizedText.tsx can
 * decide per-word what to include, rather than this module pre-formatting
 * strings for it.
 */
export interface HintSettings {
  translationEnabled: boolean;
  romanizationEnabled: boolean;
}

/**
 * Whether the course-wide hint map should actually be handed to this
 * exercise's components, or the shared empty one instead — three independent
 * reasons to hide it: both local hint toggles are off (nothing to show
 * either way), the learner's own scriptMode preference is "romanized" (their
 * exercises are already rendered in Latin script, so there's no native-script
 * text here to hover in the first place — see user_prefs.script_mode's
 * "native"|"romanized"|"both"), or this specific exercise's own scriptMode
 * isn't "native" (a "romanized"-authored exercise's own tiles/prompt are
 * already Latin — ExerciseArtifact's own doc). Centralized here so every page
 * gates the same way instead of each re-deriving the three-condition check.
 */
export function gateLexemeHintMap(
  courseMap: ReadonlyMap<string, WordHint>,
  opts: {
    settings: HintSettings;
    scriptModePref: ScriptMode | undefined;
    exerciseScriptMode: ExerciseScriptMode;
  },
): ReadonlyMap<string, WordHint> {
  if (
    (!opts.settings.translationEnabled && !opts.settings.romanizationEnabled) ||
    opts.scriptModePref === "romanized" ||
    opts.exerciseScriptMode !== "native"
  ) {
    return EMPTY_HINT_MAP;
  }
  return courseMap;
}
