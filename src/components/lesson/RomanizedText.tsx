import styles from "./RomanizedText.module.css";

/**
 * One word/tile, hover- and focus-revealing its romanization in a small box
 * pinned directly above it (Duolingo's word-tooltip), centered over the word
 * but sized to its own content (not clamped to the word's width — a native
 * script glyph or two is often much narrower than its Latin romanization, so
 * clamping just cut the tooltip text off). Renders as plain text when
 * there's nothing to show, so a caller can route every word through this
 * unconditionally rather than branching per-word.
 */
export function RomanizedWord({ word, romanization }: { word: string; romanization?: string | null }) {
  if (!romanization) return <>{word}</>;

  return (
    <span className={styles.wrap} tabIndex={0}>
      {word}
      <span className={styles.tooltip} role="tooltip">
        {romanization}
      </span>
    </span>
  );
}

/**
 * Free-form native-script text (an exercise prompt, a revealed answer) split
 * word-by-word through RomanizedWord — whitespace itself passes through
 * unchanged (the capturing split keeps it as its own piece) so spacing/RTL
 * layout isn't disturbed. `romanizationMap` is expected pre-gated by the
 * caller (empty when the hint is off/not applicable) — every word simply
 * renders plain when its lookup misses, so passing an empty map here is the
 * same as not calling this at all.
 */
export function RomanizedText({ text, romanizationMap }: { text: string; romanizationMap: ReadonlyMap<string, string> }) {
  return (
    <>
      {text.split(/(\s+)/).map((piece, i) =>
        /^\s*$/.test(piece) ? piece : <RomanizedWord key={i} word={piece} romanization={romanizationMap.get(piece)} />,
      )}
    </>
  );
}
