import type { HintSettings, WordHint } from "../../domain/romanization";
import styles from "./RomanizedText.module.css";

interface TooltipPart {
  /** Whether this part's toggle is on — independent of whether it actually has text to contribute. */
  include: boolean;
  text: string | null | undefined;
  /** Given the final text and whether this ended up the tooltip's only line, return what to render. Parts that don't need special formatting (translation) can omit this. */
  format?: (text: string, isOnlyLine: boolean) => string;
}

/**
 * Assembles the lines a word's tooltip should show from independent parts,
 * each deciding for itself whether it contributes (`include` and having
 * `text`) and, once every part knows whether it ended up alone, how to
 * format itself. This is the whole "translation adds if enabled, phonetic
 * reading adds if enabled and brackets itself unless it's alone" rule,
 * expressed as data instead of nested conditionals — adding a third kind of
 * hint later means adding one more part, not touching the two that exist.
 */
function assembleTooltipLines(parts: TooltipPart[]): string[] {
  const active = parts.filter((part) => part.include && part.text);
  return active.map((part) => (part.format ? part.format(part.text!, active.length === 1) : part.text!));
}

/**
 * One word/tile, hover- and focus-revealing its hint(s) in a small box
 * pinned directly above it (Duolingo's word-tooltip), centered over the word
 * but sized to its own content (not clamped to the word's width — a native
 * script glyph or two is often much narrower than its Latin hint text, so
 * clamping just cut the tooltip text off). The tooltip itself decides what
 * it has to show: a translation line when `settings.translationEnabled`,
 * a phonetic-reading line (bracketed only when it isn't the only line, i.e.
 * only when the translation is showing alongside it) when
 * `settings.romanizationEnabled` — and renders as plain text the moment
 * neither yields anything, so a caller can route every word through this
 * unconditionally rather than branching per-word.
 */
export function RomanizedWord({
  word,
  hint,
  settings,
}: {
  word: string;
  hint?: WordHint | null;
  settings: HintSettings;
}) {
  const lines = hint
    ? assembleTooltipLines([
        { include: settings.translationEnabled, text: hint.translation },
        {
          include: settings.romanizationEnabled,
          text: hint.romanization,
          format: (text, isOnlyLine) => (isOnlyLine ? text : `[${text}]`),
        },
      ])
    : [];

  if (lines.length === 0) return <>{word}</>;

  return (
    <span className={styles.wrap} tabIndex={0}>
      {word}
      <span className={styles.tooltip} role="tooltip">
        {lines.map((line, i) => (
          <span key={i} className={styles.tooltipLine}>
            {line}
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * Free-form native-script text (an exercise prompt, a revealed answer) split
 * word-by-word through RomanizedWord — whitespace itself passes through
 * unchanged (the capturing split keeps it as its own piece) so spacing/RTL
 * layout isn't disturbed. `hintMap` is expected pre-gated by the caller
 * (empty when both hints are off/not applicable — domain/romanization.ts's
 * gateLexemeHintMap) — every word simply renders plain when its lookup
 * misses, so passing an empty map here is the same as not calling this at
 * all.
 */
export function RomanizedText({
  text,
  hintMap,
  settings,
}: {
  text: string;
  hintMap: ReadonlyMap<string, WordHint>;
  settings: HintSettings;
}) {
  return (
    <>
      {text.split(/(\s+)/).map((piece, i) =>
        /^\s*$/.test(piece) ? piece : <RomanizedWord key={i} word={piece} hint={hintMap.get(piece)} settings={settings} />,
      )}
    </>
  );
}
