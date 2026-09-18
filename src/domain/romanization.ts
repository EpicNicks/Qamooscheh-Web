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
import type { ExerciseScriptMode } from "./enums";
import type { ScriptDisplay } from "./annotation";

/**
 * What a hovered/focused word can offer, plus what an annotated rendering
 * needs to show a reading above (or substitute for) the native surface.
 * Which of these actually renders is up to the viewing component's own
 * TextDisplaySettings, not this data.
 */
export interface WordHint {
  translation: string;
  /** Latin transliteration. The tooltip's phonetic line, and the on-screen base text in "romanized" display. */
  romanization: string | null;
  /** The small text printed above this surface in "both" display: Japanese kana furigana where authored, otherwise the Latin romanization. Persian has no separate reading, so for fa these are always the same string. */
  ruby: string | null;
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
      ruby: existing?.ruby ?? entry.reading ?? entry.romanization,
    });
  }
  return map;
}

/** Shared empty instance for "hints are off/not applicable right now" — avoids allocating a fresh Map every render just to disable the feature. */
export const EMPTY_HINT_MAP: ReadonlyMap<string, WordHint> = new Map();

/** Shared "nothing enabled, native display" instance for components whose caller omitted `TextDisplaySettings` entirely — kept beside EMPTY_HINT_MAP since the two defaults are a matched pair (an empty map with settings enabled, or vice versa, would still correctly show nothing, but every component here defaults both together). */
export const PLAIN_TEXT: TextDisplaySettings = { display: "native", translationEnabled: false, romanizationEnabled: false };

/**
 * Everything that decides how a word/tile/prompt actually renders: which
 * script is the base line (and whether a reading is printed above it —
 * `display`, from user_prefs.scriptMode plus ja's local showFurigana via
 * domain/annotation.ts's resolveScriptDisplay), and the learner's two
 * independent local hover-hint toggles (hooks/useShowTranslationHints.ts,
 * hooks/useShowRomanizationHints.ts). Threaded down to
 * AnnotatedWord/AnnotatedText alongside the hint map itself so the rendering
 * and tooltip-assembly logic in components/lesson/AnnotatedText.tsx can
 * decide per-word what to show, rather than this module pre-formatting
 * strings for it.
 */
export interface TextDisplaySettings {
  display: ScriptDisplay;
  translationEnabled: boolean;
  romanizationEnabled: boolean;
}

/**
 * Whether the course-wide hint map should actually be handed to this
 * exercise's components, or the shared empty one instead. Two independent
 * reasons it's needed: the learner's hover-hint toggles (translation and/or
 * romanization), or a non-native `display` (romanized substitution or ruby
 * annotation both need the map to know what to show/substitute). Either way
 * it's moot when this specific exercise's own scriptMode isn't "native" (a
 * "romanized"-authored exercise's own tiles/prompt are already Latin —
 * ExerciseArtifact's own doc, so there is no native-script text to annotate
 * or hover). Centralized here so every page gates the same way instead of
 * each re-deriving the check.
 *
 * <b>Deliberately NOT gated on the learner's own scriptMode preference for
 * whether native text is PRESENT.</b> That preference is what a lesson's
 * session plan uses to pick which exercises to serve, but it names no such
 * filter for stories/conversations/songs — useSkillWalkthrough reads a
 * skill's exercises straight through, in authored order, regardless of the
 * learner's preference (see its own doc). A "romanized" `display` therefore
 * does NOT mean "no native-script text is ever on screen" — a Persian story
 * authored `scriptMode: "native"` still shows native text by default, and
 * this function is what makes the learner's display preference actually
 * apply to it (substituting/annotating that text) rather than being a
 * no-op. Whether native text is actually present is a fact about THIS
 * exercise, not about the learner's preference, so `exerciseScriptMode` is
 * the only thing this checks for eligibility.
 */
export function gateLexemeHintMap(
  courseMap: ReadonlyMap<string, WordHint>,
  opts: {
    settings: TextDisplaySettings;
    exerciseScriptMode: ExerciseScriptMode;
  },
): ReadonlyMap<string, WordHint> {
  const nothingToShow = !opts.settings.translationEnabled && !opts.settings.romanizationEnabled && opts.settings.display === "native";
  if (nothingToShow || opts.exerciseScriptMode !== "native") {
    return EMPTY_HINT_MAP;
  }
  return courseMap;
}
