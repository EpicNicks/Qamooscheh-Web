import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { segmentAnnotatedText } from "../../domain/annotation";
import { registerLabel, type TextDisplaySettings, type WordHint } from "../../domain/romanization";
import { stripReadingAids } from "../../domain/persian/normalize";
import { englishCandidates, segmentEnglish } from "../../domain/englishHints";
import { useHoverSpeech, type WordSpeech } from "../../hooks/useHoverSpeech";
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
  /** Called each time the tooltip is shown — how an English word's hint marks its exercise as hinted (EnglishAnnotatedText). */
  onReveal?: () => void;
  /**
   * Off for a copy moved under a CSS transform (WordBankExercise's drag
   * overlay): a transformed ancestor becomes what `position: fixed` is
   * relative to, so the tooltip's viewport coordinates land far off to the side.
   */
  tooltip?: boolean;
  /** Reads the word aloud once hovered, focused or tapped (hooks/useHoverSpeech.ts) — null/omitted for none. */
  speech?: WordSpeech | null;
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
const TOOLTIP_VIEWPORT_MARGIN = 8;
/** Gap between the word and its tooltip, matching the old `margin-bottom`. */
const TOOLTIP_GAP = 4;

interface TooltipPosition {
  x: number;
  y: number;
  /** Below the word instead of above, when there isn't room above it on screen. */
  below: boolean;
}

export function AnnotatedWord({ word, hint, settings, focusable = true, onReveal, tooltip = true, speech }: AnnotatedWordProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  // The tooltip is `position: fixed`, not absolute. That way no scrolling or
  // overflow-clipped ancestor can cut it off; StoryTranscript's scroller used
  // to hide a tall tooltip under the chapter title. Viewport coordinates are
  // computed each time it's about to show, and again on scroll/resize while
  // it's shown. `visibility: hidden` (not `display: none`) keeps the hidden
  // tooltip laid out, so it can be measured before the fade-in starts.
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [shown, setShown] = useState(false);

  const place = useCallback(() => {
    const wrap = wrapRef.current;
    const el = tooltipRef.current;
    if (!wrap || !el) return;
    const anchor = wrap.getBoundingClientRect();
    const halfWidth = el.offsetWidth / 2;
    const minX = TOOLTIP_VIEWPORT_MARGIN + halfWidth;
    const maxX = window.innerWidth - TOOLTIP_VIEWPORT_MARGIN - halfWidth;
    const x = Math.min(Math.max(anchor.left + anchor.width / 2, minX), Math.max(minX, maxX));
    const below = anchor.top - TOOLTIP_GAP - el.offsetHeight < TOOLTIP_VIEWPORT_MARGIN;
    const y = below ? anchor.bottom + TOOLTIP_GAP : anchor.top - TOOLTIP_GAP;
    setPosition({ x, y, below });
  }, []);

  const show = useCallback(() => {
    place();
    setShown(true);
    onReveal?.();
  }, [place, onReveal]);
  const hide = useCallback(() => setShown(false), []);
  const speak = () => speech?.start(word);
  const unspeak = () => speech?.cancel();

  // A non-focusable word sits inside a focusable control (a word-bank tile),
  // and its tooltip reveals on that control's focus. See the
  // `:focus-visible > .wrap` rule in AnnotatedText.module.css.
  useEffect(() => {
    if (focusable) return;
    const parent = wrapRef.current?.parentElement;
    if (!parent) return;
    parent.addEventListener("focus", show);
    parent.addEventListener("blur", hide);
    return () => {
      parent.removeEventListener("focus", show);
      parent.removeEventListener("blur", hide);
    };
  }, [focusable, show, hide]);

  // Fixed coordinates go stale when anything scrolls, so follow the word while
  // the tooltip is up. Capture phase catches inner scrollers like the transcript.
  useEffect(() => {
    if (!shown) return;
    window.addEventListener("scroll", place, { capture: true, passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, { capture: true });
      window.removeEventListener("resize", place);
    };
  }, [shown, place]);

  const register = registerLabel(hint?.register);
  // The ezafe (domain/ezafe.ts) is shown as its own piece after the word —
  // [book](-e) in the tooltip, ketāb(-e) in a romanized line — never folded
  // into the word's own text.
  const ezafe = hint?.ezafe;
  const ezafeMark = (className: string) => (ezafe ? <span className={className}>{ezafe}</span> : null);
  const lines = hint
    ? assembleTooltipLines([
        { include: settings.translationEnabled, text: register ? `${hint.translation} [${register}]` : hint.translation },
        {
          include: settings.romanizationEnabled && settings.display === "native",
          text: hint.romanization !== null && ezafe ? hint.romanization + ezafe : hint.romanization,
          format: (text, isOnlyLine) => (isOnlyLine ? text : `[${text}]`),
        },
      ])
    : [];
  const tooltipLines: ReactNode[] = lines.map((line, i) =>
    i === 0 && settings.translationEnabled && ezafe ? (
      <>
        {line} {ezafeMark(styles.ezafeChip)}
      </>
    ) : (
      line
    ),
  );
  // A marked ezafe is worth pointing out even with the translation hint off.
  if (ezafe && !settings.translationEnabled) {
    tooltipLines.push(
      <>
        {ezafeMark(styles.ezafeChip)} ezafe
      </>,
    );
  }

  const base =
    settings.display === "romanized" && hint?.romanization != null ? (
      <>
        {hint.romanization}
        {ezafeMark(styles.ezafeInline)}
      </>
    ) : settings.vowelMarks ? (
      word
    ) : (
      stripReadingAids(word)
    );

  const content: ReactNode =
    settings.display === "both" ? (
      <ruby className={styles.ruby}>
        {base}
        <rt className={styles.rt} dir="ltr">
          {hint?.ruby ?? " "}
          {hint?.ruby != null && ezafeMark(styles.ezafeInline)}
        </rt>
      </ruby>
    ) : (
      base
    );

  if (!tooltip || tooltipLines.length === 0) {
    return speech ? (
      <span onMouseEnter={speak} onMouseLeave={unspeak}>
        {content}
      </span>
    ) : (
      <>{content}</>
    );
  }

  return (
    <span
      ref={wrapRef}
      className={styles.wrap}
      data-ezafe={ezafe ? "" : undefined}
      tabIndex={focusable ? 0 : undefined}
      onMouseEnter={() => {
        show();
        speak();
      }}
      onMouseLeave={() => {
        hide();
        unspeak();
      }}
      onFocus={() => {
        show();
        speak();
      }}
      onBlur={() => {
        hide();
        unspeak();
      }}
    >
      {content}
      <span
        ref={tooltipRef}
        className={styles.tooltip}
        role="tooltip"
        data-placement={position?.below ? "below" : "above"}
        style={
          position ? ({ "--tooltip-x": `${position.x}px`, "--tooltip-y": `${position.y}px` } as CSSProperties) : undefined
        }
      >
        {tooltipLines.map((line, i) => (
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
 * all. `tags` are the exercise's lexeme tags, which say how a word with
 * endings attached splits (سرم = سر<n> + ـم<poss>).
 */
export function AnnotatedText({
  text,
  hintMap,
  settings,
  focusable,
  tags,
  tooltip,
}: {
  text: string;
  hintMap: ReadonlyMap<string, WordHint>;
  settings: TextDisplaySettings;
  focusable?: boolean;
  tags?: readonly string[];
  /** See AnnotatedWord's `tooltip`. */
  tooltip?: boolean;
}) {
  // Not inside a control (a word-bank tile): picking a tile already reads it.
  const speech = useHoverSpeech(tags);
  const wordSpeech = focusable === false ? null : speech;
  return (
    <>
      {segmentAnnotatedText(text, hintMap, tags).map((segment, i) =>
        segment.isWord ? (
          <AnnotatedWord
            key={i}
            word={segment.text}
            hint={segment.hint}
            settings={settings}
            focusable={focusable}
            tooltip={tooltip}
            speech={wordSpeech}
          />
        ) : settings.vowelMarks ? (
          segment.text
        ) : (
          stripReadingAids(segment.text)
        ),
      )}
    </>
  );
}

/**
 * An English prompt with the other direction's hover (domain/englishHints.ts):
 * a word matching one of this exercise's lexemes shows that lexeme as it's
 * written, plus its romanization when the learner's romanization hint is on.
 * Reuses AnnotatedWord's tooltip by handing it the native word as the line to
 * show, in plain "native" display. `onReveal` fires when a hover is shown —
 * the exercise counts as hinted, since on an English->native exercise this
 * gives away part of the answer.
 */
export function EnglishAnnotatedText({
  text,
  tags,
  hintMap,
  settings,
  onReveal,
}: {
  text: string;
  tags: readonly string[];
  hintMap: ReadonlyMap<string, WordHint>;
  settings: TextDisplaySettings;
  onReveal?: () => void;
}) {
  const wordSettings: TextDisplaySettings = { ...settings, display: "native", translationEnabled: true };
  const speech = useHoverSpeech(tags);
  return (
    <>
      {segmentEnglish(text, englishCandidates(tags, hintMap)).map((segment, i) =>
        segment.hint ? (
          <AnnotatedWord
            key={i}
            word={segment.text}
            hint={{ translation: segment.hint.native, romanization: segment.hint.romanization, ruby: null }}
            settings={wordSettings}
            onReveal={onReveal}
            speech={speech}
          />
        ) : segment.isWord && speech ? (
          <AnnotatedWord key={i} word={segment.text} hint={null} settings={wordSettings} speech={speech} />
        ) : (
          segment.text
        ),
      )}
    </>
  );
}
