import { useCallback, useContext, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { segmentAnnotatedText } from "../../domain/annotation";
import { PLAIN_TEXT, registerLabel, type TextDisplaySettings, type WordHint } from "../../domain/romanization";
import { MISTAKE_HINTS, type MistakeKind } from "../../domain/mistakeHints";
import { stripReadingAids } from "../../domain/persian/normalize";
import { englishCandidates, segmentEnglish } from "../../domain/englishHints";
import { createHoverCloser } from "../../domain/hintHover";
import { useVerbEntry } from "../../hooks/useVerbEntry";
import { VerbFormsModal } from "./VerbFormsModal";
import { cancelHoverSpeech, useHoverSpeech, type WordSpeech } from "../../hooks/useHoverSpeech";
import { NewWordsScope } from "../../hooks/newWordsScope";
import { isNewNativeWord, withNewWordHints } from "../../domain/newWords";
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
  /** Set while revealing the hint still needs the learner's go-ahead (the XP warning): hover, focus or a press hands `proceed` here instead of opening the tooltip, and the caller runs it once they agree. */
  gate?: (proceed: () => void) => void;
  /**
   * Off for a copy moved under a CSS transform (WordBankExercise's drag
   * overlay): a transformed ancestor becomes what `position: fixed` is
   * relative to, so the tooltip's viewport coordinates land far off to the side.
   */
  tooltip?: boolean;
  /** Reads the word aloud once hovered, focused or tapped (hooks/useHoverSpeech.ts) — null/omitted for none. */
  speech?: WordSpeech | null;
  /** A button: click, tap, Enter or Space opens the tooltip and keeps it open until pressed again or left (MistakeHintChip). */
  toggle?: boolean;
  /** One of the words its Parsle introduces (domain/newWords.ts): highlighted under its underline. */
  isNew?: boolean;
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
/** How long the verb forms popover outlasts the pointer leaving it and its word — enough to cross the gap, or to glance away and back. */
const VERB_FORMS_CLOSE_DELAY_MS = 400;

/** Gap between the word and its tooltip, matching the old `margin-bottom`. */
const TOOLTIP_GAP = 4;

interface TooltipPosition {
  x: number;
  y: number;
  /** Below the word instead of above, when there isn't room above it on screen. */
  below: boolean;
}

export function AnnotatedWord({
  word,
  hint,
  settings,
  focusable = true,
  onReveal,
  gate,
  tooltip = true,
  speech,
  toggle = false,
  isNew = false,
}: AnnotatedWordProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  // The tooltip is `position: fixed`, not absolute. That way no scrolling or
  // overflow-clipped ancestor can cut it off; StoryTranscript's scroller used
  // to hide a tall tooltip under the chapter title. Viewport coordinates are
  // computed each time it's about to show, and again on scroll/resize while
  // it's shown. `visibility: hidden` (not `display: none`) keeps the hidden
  // tooltip laid out, so it can be measured before the fade-in starts.
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  // Open because the pointer is over the word or its hint (closing is delayed
  // so the pointer can cross the gap between them — domain/hintHover.ts), or
  // because the word has keyboard focus.
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

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

  // Positions the tooltip and counts it as shown — what opens it (hover, focus
  // or a press) is the caller's own state, so a hover never leaves it marked focused.
  const reveal = useCallback(() => {
    place();
    onReveal?.();
  }, [place, onReveal]);
  const show = useCallback(() => {
    reveal();
    setFocused(true);
  }, [reveal]);
  const hide = useCallback(() => setFocused(false), []);
  // Opened by a press (`toggle`), not hover/focus: no CSS state to show it
  // with on a tap or a click, so it's shown by data-open instead.
  const [pinned, setPinned] = useState(false);
  // Closed by a press or Escape while hover/focus would still show it; holds
  // until the pointer leaves or focus moves on.
  const [dismissed, setDismissed] = useState(false);
  const [hoverCloser] = useState(() =>
    createHoverCloser((value) => {
      setHovered(value);
      if (!value) setDismissed(false);
    }),
  );
  useEffect(() => () => hoverCloser.close(), [hoverCloser]);
  // A touch tap pins the hint like a press does; a mouse's hover is handled above.
  const lastPointer = useRef("mouse");
  const verbEntry = useVerbEntry(focusable ? hint?.verbLemma : undefined);
  const [verbFormsOpen, setVerbFormsOpen] = useState(false);
  // The word the popover is placed against; set when it opens, as a ref can't be read during render.
  const [verbFormsAnchor, setVerbFormsAnchor] = useState<HTMLElement | null>(null);
  // Lets the verb forms popover linger a moment after the pointer leaves it and
  // the word, and stay while either is hovered (shared, since it's portalled
  // out of the word and the pointer crosses a gap between the two).
  const [verbFormsCloser] = useState(() =>
    createHoverCloser((value) => {
      if (!value) setVerbFormsOpen(false);
    }, VERB_FORMS_CLOSE_DELAY_MS),
  );
  useEffect(() => () => verbFormsCloser.close(), [verbFormsCloser]);
  const flipPinned = () => {
    if (!pinned && gate) {
      gate(() => {
        reveal();
        setPinned(true);
        setDismissed(false);
      });
      return;
    }
    if (!pinned) reveal();
    setPinned(!pinned);
    setDismissed(pinned);
  };
  const tooltipId = useId();
  // This rendering of the word, as far as hover speech is concerned. A word
  // that goes away while it waits (the learner moved on) is never read.
  const [speechOwner] = useState(() => ({}));
  const speak = () => speech?.start(word, speechOwner);
  const unspeak = () => cancelHoverSpeech(speechOwner);
  useEffect(() => () => cancelHoverSpeech(speechOwner), [speechOwner]);

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
  const wasOpen = hovered || focused || pinned;
  const open = wasOpen && !dismissed;
  useEffect(() => {
    if (!wasOpen) return;
    window.addEventListener("scroll", place, { capture: true, passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, { capture: true });
      window.removeEventListener("resize", place);
    };
  }, [wasOpen, place]);

  // Esc dismisses a hover-only hint too, wherever focus is (WCAG 1.4.13).
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setPinned(false);
      setDismissed(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const register = registerLabel(hint?.register);
  // The ezafe (domain/ezafe.ts) is shown as its own piece after the word —
  // [book](-e) in the tooltip, ketāb(-e) in a romanized line — never folded
  // into the word's own text.
  const ezafe = hint?.ezafe;
  const ezafeMark = (className: string) => (ezafe ? <span className={className}>{ezafe}</span> : null);
  const lines = hint
    ? assembleTooltipLines([
        {
          include: settings.translationEnabled,
          text: register ? `${hint.translation} [${register}]` : hint.translation,
        },
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
    tooltipLines.push(<>{ezafeMark(styles.ezafeChip)} ezafe</>);
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

  if (!tooltip || (tooltipLines.length === 0 && !verbEntry)) {
    return speech ? (
      <span onMouseEnter={speak} onMouseLeave={unspeak}>
        {content}
      </span>
    ) : (
      <>{content}</>
    );
  }

  return (
    <>
      <span
        ref={wrapRef}
        className={styles.wrap}
        data-ezafe={ezafe ? "" : undefined}
        data-new={isNew ? "" : undefined}
        data-open={open ? "" : undefined}
        data-dismissed={dismissed ? "" : undefined}
        tabIndex={focusable ? 0 : undefined}
        role={toggle && !verbEntry ? "button" : undefined}
        aria-label={toggle && !verbEntry ? word : undefined}
        aria-expanded={toggle && !verbEntry ? pinned : undefined}
        aria-controls={toggle ? tooltipId : undefined}
        aria-describedby={toggle ? tooltipId : undefined}
        onPointerDown={(event) => {
          lastPointer.current = event.pointerType;
        }}
        onClick={() => {
          if (toggle || lastPointer.current === "touch") flipPinned();
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) {
            // From the hint's own "Verb forms" button: it activates itself, and
            // Enter must not reach useAnswerConfirmation's window listener.
            if (event.key === "Enter") event.stopPropagation();
          } else if (toggle && (event.key === "Enter" || event.key === " ")) {
            // Not on to useAnswerConfirmation's window listener, where
            // Enter would also move on past the review.
            event.preventDefault();
            event.stopPropagation();
            flipPinned();
          } else if (event.key === "Escape" && open) {
            event.stopPropagation();
            setPinned(false);
            setDismissed(true);
          }
        }}
        onPointerEnter={(event) => {
          // A touch's pointer "enters" for the length of the tap; the tap itself pins.
          if (event.pointerType === "touch") return;
          if (gate && !open) {
            // Only if the pointer is still on the word once they've agreed.
            gate(() => {
              if (!wrapRef.current?.matches(":hover")) return;
              reveal();
              hoverCloser.enter();
            });
            return;
          }
          if (!open) reveal();
          hoverCloser.enter();
          if (verbFormsOpen) verbFormsCloser.enter();
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "touch") return;
          hoverCloser.leave();
          if (verbFormsOpen) verbFormsCloser.leave();
        }}
        onMouseEnter={speak}
        onMouseLeave={unspeak}
        onFocus={(event) => {
          // Only keyboard focus opens it: a click or tap focuses the word too.
          if (!focused && event.target.matches(":focus-visible")) {
            if (gate) gate(show);
            else show();
          }
          speak();
        }}
        onBlur={(event) => {
          // Moving on to the hint's own "Verb forms" button is still inside.
          if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
          hide();
          setPinned(false);
          setDismissed(false);
          unspeak();
        }}
      >
        {content}
        <span
          ref={tooltipRef}
          id={toggle ? tooltipId : undefined}
          className={styles.tooltip}
          role="tooltip"
          data-placement={position?.below ? "below" : "above"}
          style={
            position
              ? ({
                  "--tooltip-x": `${position.x}px`,
                  "--tooltip-y": `${position.y}px`,
                } as CSSProperties)
              : undefined
          }
        >
          {tooltipLines.map((line, i) => (
            <span key={i} className={styles.tooltipLine}>
              {line}
            </span>
          ))}
          {verbEntry && (
            <button
              type="button"
              className={styles.verbFormsButton}
              onClick={(event) => {
                event.stopPropagation();
                setVerbFormsAnchor(wrapRef.current);
                setVerbFormsOpen(true);
              }}
            >
              Verb forms
            </button>
          )}
        </span>
      </span>
      {verbEntry && verbFormsOpen && (
        <VerbFormsModal
          entry={verbEntry}
          anchorEl={verbFormsAnchor}
          onClose={() => {
            verbFormsCloser.close();
            wrapRef.current?.focus({ preventScroll: true });
          }}
          onPointerEnter={verbFormsCloser.enter}
          onPointerLeave={verbFormsCloser.leave}
        />
      )}
    </>
  );
}

/** A mistake hint is the chip's only tooltip line. */
const MISTAKE_HINT_TEXT: TextDisplaySettings = {
  ...PLAIN_TEXT,
  translationEnabled: true,
  vowelMarks: true,
};

/**
 * An "explain" chip shown next to a word the correction marks, when that
 * mark is a common mistake (domain/mistakeHints.ts). Pressing it opens the
 * explanation in the word tooltip; hover and keyboard focus do too. Left to
 * right: the explanation is an English sentence with Persian examples in it.
 */
export function MistakeHintChip({ kind }: { kind: MistakeKind }) {
  return (
    <span className={styles.hintChip} dir="ltr">
      <AnnotatedWord
        word="explain"
        hint={{
          translation: MISTAKE_HINTS[kind],
          romanization: null,
          ruby: null,
        }}
        settings={MISTAKE_HINT_TEXT}
        toggle
      />
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
  // A new word shows its translation even with the learner's hover hints off.
  const newWords = useContext(NewWordsScope);
  const newWordSettings: TextDisplaySettings = { ...settings, translationEnabled: true };
  return (
    <>
      {segmentAnnotatedText(text, withNewWordHints(hintMap, newWords), tags).map((segment, i) => {
        if (!segment.isWord) return settings.vowelMarks ? segment.text : stripReadingAids(segment.text);
        const isNew = segment.hint != null && isNewNativeWord(segment.text, newWords);
        return (
          <AnnotatedWord
            key={i}
            word={segment.text}
            hint={segment.hint}
            settings={isNew ? newWordSettings : settings}
            focusable={focusable}
            tooltip={tooltip}
            speech={wordSpeech}
            isNew={isNew}
          />
        );
      })}
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
  gate,
}: {
  text: string;
  tags: readonly string[];
  hintMap: ReadonlyMap<string, WordHint>;
  settings: TextDisplaySettings;
  onReveal?: () => void;
  gate?: (proceed: () => void) => void;
}) {
  const wordSettings: TextDisplaySettings = {
    ...settings,
    display: "native",
    translationEnabled: true,
  };
  const speech = useHoverSpeech(tags);
  // A new word's hover is there even with the learner's English hover hints
  // off, and is free: no warning, and the exercise doesn't count as hinted.
  const newWords = useContext(NewWordsScope);
  const hoverTags = settings.nativeEnabled ? tags : tags.filter((tag) => newWords.tags.has(tag));
  return (
    <>
      {segmentEnglish(text, englishCandidates(hoverTags, withNewWordHints(hintMap, newWords))).map((segment, i) => {
        if (!segment.hint) {
          return segment.isWord && speech ? <AnnotatedWord key={i} word={segment.text} hint={null} settings={wordSettings} speech={speech} /> : segment.text;
        }
        const isNew = newWords.tags.has(segment.hint.tag);
        return (
          <AnnotatedWord
            key={i}
            word={segment.text}
            hint={{
              translation: segment.hint.native,
              romanization: segment.hint.romanization,
              ruby: null,
              verbLemma: segment.hint.verbLemma,
            }}
            settings={wordSettings}
            onReveal={isNew ? undefined : onReveal}
            gate={isNew ? undefined : gate}
            speech={speech}
            isNew={isNew}
          />
        );
      })}
    </>
  );
}
