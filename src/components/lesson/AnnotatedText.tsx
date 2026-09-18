import type { ReactNode } from "react";
import { segmentAnnotatedText } from "../../domain/annotation";
import type { TextDisplaySettings, WordHint } from "../../domain/romanization";
import styles from "./AnnotatedText.module.css";

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
 * reading adds if enabled (and not already visible as ruby/base text) and
 * brackets itself unless it's alone" rule, expressed as data instead of
 * nested conditionals — adding a third kind of hint later means adding one
 * more part, not touching the two that exist.
 */
function assembleTooltipLines(parts: TooltipPart[]): string[] {
  const active = parts.filter((part) => part.include && part.text);
  return active.map((part) => (part.format ? part.format(part.text!, active.length === 1) : part.text!));
}

interface AnnotatedWordProps {
  word: string;
  hint?: WordHint | null;
  settings: TextDisplaySettings;
  /** Off when the caller already renders this inside a focusable control (WordBankExercise's tiles). */
  focusable?: boolean;
}

/**
 * One word/tile, rendered according to `settings.display`:
 *
 *   - "native"    — the native surface, unchanged from before this display
 *                    preference existed.
 *   - "both"      — the native surface with a small reading in a real
 *                    `<ruby>/<rt>` above it: `hint.ruby` when a lexeme has one
 *                    (Japanese furigana where authored, otherwise the same as
 *                    romanization), or a non-breaking space when it doesn't —
 *                    EVERY word gets an `<rt>` in this mode, not just annotated
 *                    ones, so a line of mixed annotated/unannotated words
 *                    doesn't jump in height.
 *   - "romanized" — the Latin romanization substituted as the base text, or
 *                    the native surface itself when this word has none
 *                    authored (a native island in a Latin line, not a wrong
 *                    guess — see domain/annotation.ts's segmentAnnotatedText).
 *
 * On top of that base rendering, hovering/focusing still reveals a tooltip
 * for the learner's two independent local toggles — translation always when
 * enabled, and the bracketed romanization line ONLY in "native" display
 * (in "both"/"romanized" the reading is already visible on screen, so a
 * second copy in the tooltip would be redundant).
 *
 * `focusable` is what a caller that already renders this inside a focusable
 * control (WordBankExercise's tiles are `<button>`s) turns off: interactive
 * content nested inside a button is invalid HTML and gives every tile two tab
 * stops instead of one. With it off the span is inert and the tooltip reveals
 * on the enclosing control's own focus instead — see AnnotatedText.module.css's
 * `:focus-visible > .wrap` rule.
 */
export function AnnotatedWord({ word, hint, settings, focusable = true }: AnnotatedWordProps) {
  const lines = hint
    ? assembleTooltipLines([
        { include: settings.translationEnabled, text: hint.translation },
        {
          include: settings.romanizationEnabled && settings.display === "native",
          text: hint.romanization,
          format: (text, isOnlyLine) => (isOnlyLine ? text : `[${text}]`),
        },
      ])
    : [];

  const base = settings.display === "romanized" ? (hint?.romanization ?? word) : word;

  const content: ReactNode =
    settings.display === "both" ? (
      <ruby className={styles.ruby}>
        {base}
        <rt className={styles.rt} dir="ltr">
          {hint?.ruby ?? " "}
        </rt>
      </ruby>
    ) : (
      base
    );

  if (lines.length === 0) return <>{content}</>;

  return (
    <span className={styles.wrap} tabIndex={focusable ? 0 : undefined}>
      {content}
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
 * word-by-word (and, where a multi-word lexeme matches, phrase-by-phrase —
 * see segmentAnnotatedText) through AnnotatedWord — everything between words
 * (whitespace, punctuation) passes through unchanged as plain text, so
 * spacing/RTL layout isn't disturbed. `hintMap` is expected pre-gated by the
 * caller (empty when nothing needs it — domain/romanization.ts's
 * gateLexemeHintMap): every word simply renders plain when its lookup
 * misses, so passing an empty map here is the same as not calling this at
 * all.
 */
export function AnnotatedText({
  text,
  hintMap,
  settings,
  focusable,
}: {
  text: string;
  hintMap: ReadonlyMap<string, WordHint>;
  settings: TextDisplaySettings;
  focusable?: boolean;
}) {
  return (
    <>
      {segmentAnnotatedText(text, hintMap).map((segment, i) =>
        segment.isWord ? (
          <AnnotatedWord key={i} word={segment.text} hint={segment.hint} settings={settings} focusable={focusable} />
        ) : (
          segment.text
        ),
      )}
    </>
  );
}
