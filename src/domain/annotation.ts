// How native-script text actually renders on screen, driven by the learner's
// script-display preference (user_prefs.scriptMode, plus Japanese's local
// showFurigana toggle) — see components/lesson/AnnotatedText.tsx for the
// renderer this feeds, and domain/romanization.ts for WordHint/gateLexemeHintMap.
import type { WordHint } from "./romanization";
import type { ScriptMode } from "./enums";
import type { Language, WritingDirection } from "./language";
import { detectScriptDirection } from "./language";

/** Same three values as ScriptMode — kept as a distinct alias since this is a DISPLAY decision, derived from (not identical in meaning to) the server-side session-planning preference it's read from. */
export type ScriptDisplay = ScriptMode;

/**
 * What the base line shows, and whether a reading is printed above it,
 * derived from the learner's scriptMode preference (plus Japanese's own
 * local furigana toggle, since scriptMode alone has no place to encode "show
 * readings" independent of "which script does session-planning prefer").
 * Computed in exactly one place (hooks/useExerciseSession.ts) and threaded
 * down through TextDisplaySettings — no component reads user_prefs directly.
 */
export function resolveScriptDisplay(opts: {
  scriptMode: ScriptMode | undefined;
  language: Language | undefined;
  showFurigana: boolean;
}): ScriptDisplay {
  if (opts.scriptMode === "romanized") return "romanized";
  if (opts.scriptMode === "both") return "both";
  // "native" (or no preference yet, e.g. still loading): Japanese's
  // furigana toggle is the one existing case of "show a reading above native
  // text" that predates this preference and has to keep working through it.
  return opts.language === "ja" && opts.showFurigana ? "both" : "native";
}

/**
 * Longest lexeme surface, in Intl.Segmenter word tokens, across every
 * shipped course (fa: 3, e.g. "هر از گاهی"). Caps segmentAnnotatedText's
 * greedy longest-match. Overshooting is harmless — a language with no
 * multi-word lexemes simply never gets a phrase hit — so this stays a
 * constant rather than a value threaded through every hintMap prop.
 */
export const MAX_PHRASE_TOKENS = 3;

interface TextPiece {
  text: string;
  /** Word-like pieces get a hint lookup; the rest (spaces, punctuation) render as-is. */
  isWord: boolean;
}

/**
 * Where a word ends, for lookup purposes. Whitespace can't answer that:
 * Japanese writes `こんにちは、元気ですか` with no spaces at all, so a
 * whitespace split hands the hint map one enormous "word" that matches
 * nothing, and the feature is simply dead for the language. Intl.Segmenter
 * applies UAX #29 word boundaries — which land in the same places whitespace
 * did for Persian, and additionally split off punctuation, so `سلام،` now
 * finds `سلام` where before it missed — plus ICU's dictionary segmentation
 * for the scripts that don't space their words. Verified to keep a ZWNJ
 * (U+200C) inside its surrounding word token, so a Persian isolated-letterform
 * spelling still looks up as one surface.
 *
 * Built once: constructing a Segmenter is the expensive part, and the rules
 * are locale-independent for our purposes (the map is keyed by literal
 * surface text, whatever course it came from).
 */
const wordSegmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "word" }) : null;

export function segmentWords(text: string): TextPiece[] {
  if (!wordSegmenter) {
    // Pre-Segmenter fallback — the original capturing whitespace split.
    return text.split(/(\s+)/).map((piece) => ({ text: piece, isWord: !/^\s*$/.test(piece) }));
  }
  return Array.from(wordSegmenter.segment(text), (segment) => ({
    text: segment.segment,
    isWord: segment.isWordLike === true,
  }));
}

export interface AnnotatedSegment {
  /** The literal source substring this segment covers, spaces between phrase tokens included verbatim. */
  text: string;
  isWord: boolean;
  hint: WordHint | null;
}

/**
 * Splits `text` into segments ready for AnnotatedText to render, doing a
 * greedy longest-match phrase lookup on top of segmentWords: at each
 * word-like piece, tries joining forward across up to MAX_PHRASE_TOKENS
 * word-like pieces (including the intervening whitespace/punctuation pieces,
 * joined verbatim from the source — never re-normalized) and takes the
 * longest run that hits `hintMap`. A hit emits ONE segment spanning the
 * whole phrase (so e.g. "آخر هفته" gets one ruby reading, "ākhar-e hafte",
 * not two); a miss falls through to the single token, and a single token
 * with no hint of its own renders as plain, unannotated native text.
 */
export function segmentAnnotatedText(text: string, hintMap: ReadonlyMap<string, WordHint>): AnnotatedSegment[] {
  const pieces = segmentWords(text);
  const segments: AnnotatedSegment[] = [];

  for (let i = 0; i < pieces.length; ) {
    const piece = pieces[i];
    if (!piece.isWord) {
      segments.push({ text: piece.text, isWord: false, hint: null });
      i++;
      continue;
    }

    // Greedy longest match: walk forward accumulating word tokens (up to
    // MAX_PHRASE_TOKENS of them), remembering the longest span that hits the
    // map. Every span tried is a legal stopping point (its own text plus
    // whatever trails it), so the last hit found is used.
    let bestEnd = i + 1;
    let bestHint: WordHint | null = hintMap.get(piece.text) ?? null;
    let wordCount = 0;
    let end = i;
    let joined = "";
    while (end < pieces.length && wordCount < MAX_PHRASE_TOKENS) {
      joined += pieces[end].text;
      if (pieces[end].isWord) wordCount++;
      end++;
      // Only a span ending on a word token (not mid-trailing-space) is a
      // candidate — pieces[end-1] must be the word itself.
      if (pieces[end - 1].isWord) {
        const hit = hintMap.get(joined);
        if (hit) {
          bestEnd = end;
          bestHint = hit;
        }
      }
    }

    segments.push({ text: pieces.slice(i, bestEnd).map((p) => p.text).join(""), isWord: true, hint: bestHint });
    i = bestEnd;
  }

  return segments;
}

/**
 * The direction a piece of text should actually render in, given the
 * learner's display preference — NOT simply detectScriptDirection(text). In
 * "romanized" display the rendered base line is Latin regardless of the
 * source script, and an RTL paragraph of Latin runs reorders as soon as
 * punctuation or a fallback native word (segmentAnnotatedText's no-hint case)
 * appears in it.
 */
export function displayDirection(text: string, display: ScriptDisplay): WritingDirection {
  return display === "romanized" ? "ltr" : detectScriptDirection(text);
}
