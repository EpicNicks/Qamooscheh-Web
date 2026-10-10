import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "../common/Button";
import { useScriptEngine, type ScriptEngine, type ScriptKeyboardHandlers } from "./keyboard/scriptEngines";
import { ExercisePrompt } from "./ExercisePrompt";
import { VirtualCaret } from "./VirtualCaret";
import { getLanguageInfo, getKeyboardKind, isPersian } from "../../domain/language";
import { detectArabicVariants, stripReadingAids, ZWNJ } from "../../domain/persian/normalize";
import { useKeyboardInputMethod } from "../../hooks/useKeyboardInputMethod";
import { useDeviceInputEnabled } from "../../hooks/useDeviceInputEnabled";
import { markTypedAnswer, type MarkedWord } from "../../domain/typedAnswerMarks";
import { submittedSpelling } from "../../domain/persian/typedAnswer";
import type { ExerciseProps } from "./ExerciseRenderer";
import styles from "./Exercise.module.css";

const LETTER_KEY = /^[a-zA-Z']$/;

const WORD_MARK_CLASS: Record<MarkedWord["mark"], string> = {
  right: styles.wordRight,
  swapped: styles.wordSwapped,
  wrong: styles.wordWrong,
  missing: styles.wordMissing,
};
/** Keys whose default action moves the caret or edits past it. Buffered engine state is resolved before they act (see handleKeyDown). */
const CARET_KEY = /^(Arrow(Left|Right|Up|Down)|Home|End|PageUp|PageDown|Delete)$/;

/**
 * Whether a keystroke landed on a control that has its own meaning for Enter
 * — the "Use a hint" button, the settings cog, a link, another text field —
 * rather than on the page at large. Same guard useAnswerConfirmation.ts
 * applies to its own window-level Enter handling; without it, Enter pressed
 * on a focused button submits the answer instead of pressing that button.
 */
function isInteractiveTarget(target: EventTarget | null, except: HTMLElement | null): boolean {
  if (!(target instanceof HTMLElement) || target === except) return false;
  return target.isContentEditable || /^(button|a|input|textarea|select)$/i.test(target.tagName) || target.getAttribute("role") === "button";
}

/** A field other than `except` that takes typing of its own — ReportIssue's textarea on the review screen, say. */
function isOtherTextField(target: EventTarget | null, except: HTMLElement | null): boolean {
  if (!(target instanceof HTMLElement) || target === except) return false;
  return target.isContentEditable || /^(input|textarea)$/i.test(target.tagName);
}

/**
 * Every keyboard-kind-specific behavior (which letters are valid, how
 * backspace/space/zwnj/submit resolve buffered state, which on-screen
 * keyboard and input overlay to show) lives behind the single ScriptEngine
 * this component asks for — see keyboard/scriptEngines.tsx. Adding a new
 * keyboard kind means writing one engine there; nothing here changes.
 */
export function TypeInExercise({ exercise, onSubmit, disabled, courseCode, keyboardMode, autoplayAudio, hintMap, textSettings, advance, reviewedAnswer, retype }: ExerciseProps) {
  // Retyping (issue #44) starts from an empty field under the checked answer.
  const initialText = retype ? "" : (reviewedAnswer?.text ?? "");
  const [text, setText] = useState(initialText);
  const [usedHint, setUsedHint] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  // The last retype didn't match — cleared by the next edit.
  const [retypeWrong, setRetypeWrong] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Mirrors `text` synchronously (state updates are batched/async, but
  // submit() needs the just-finalized value immediately — see submit()) —
  // every mutation goes through updateText so the two never drift.
  const textRef = useRef(initialText);
  // The selection every edit applies to, mirrored synchronously for the same
  // reason as textRef: one handler can make several edits in a row (pressSpace
  // finalizes and then inserts), before React has re-rendered the input and
  // the DOM's own selection has caught up.
  const selectionRef = useRef({ start: initialText.length, end: initialText.length });
  // The caret as state, so engines that draw around it (the phonetic picker,
  // the kana keyboard's dakuten key) re-render when the learner moves it.
  const [caret, setCaret] = useState(initialText.length);
  // Set by an edit this component made itself. Setting the input's value from
  // code puts the browser's caret at the end, so the layout effect below puts
  // it back where the edit left it.
  const restoreSelectionRef = useRef(false);

  const inputWrapRef = useRef<HTMLDivElement>(null);
  // Whether the answer input has focus — when it doesn't, VirtualCaret draws
  // the caret the browser stops drawing (issue #24).
  const [inputFocused, setInputFocused] = useState(false);

  const languageInfo = getLanguageInfo(courseCode);
  // A "romanized" exercise is answered in Latin script regardless of the
  // course's own direction/font — only "native" exercises get the course's
  // RTL direction and native font stack (see WordBankExercise's tileCourseCode
  // for the same gate applied to tiles).
  const isNativeScript = exercise.scriptMode === "native";
  // Still read here (rather than inside the engine) because it also decides
  // which engine to ask for in the first place.
  const fa = useKeyboardInputMethod("fa");
  const ja = useKeyboardInputMethod("ja");
  const deviceInput = useDeviceInputEnabled();
  const keyboardKind =
    languageInfo && exercise.scriptMode === "native"
      ? getKeyboardKind(courseCode, exercise.scriptMode, { fa: fa.method, ja: ja.method })
      : null;

  /**
   * Every engine edit goes through here. Engines only ever edit the END of
   * the string they're handed (append, slice(0, -1), replace the last N
   * characters), so they're handed just the text before the caret: whatever
   * is after it stays put, and editing at the caret falls out of that.
   * Anything selected is replaced, like typing over a selection normally does.
   */
  function updateText(updater: (prev: string) => string) {
    const { start, end } = selectionRef.current;
    const head = updater(textRef.current.slice(0, start));
    textRef.current = head + textRef.current.slice(end);
    selectionRef.current = { start: head.length, end: head.length };
    restoreSelectionRef.current = true;
    setText(textRef.current);
    setCaret(head.length);
    setRetypeWrong(false);
  }

  /** The whole value at once, with the caret wherever `caretAt` says (the end by default). */
  function replaceText(value: string, caretAt = value.length, caretEnd = caretAt) {
    textRef.current = value;
    selectionRef.current = { start: caretAt, end: caretEnd };
    setText(value);
    setCaret(caretAt);
    setRetypeWrong(false);
  }

  // A native caret move (click, tap, arrow keys, selecting) — mirror it.
  function syncSelection() {
    const el = inputRef.current;
    if (!el || restoreSelectionRef.current) return;
    const start = el.selectionStart ?? textRef.current.length;
    const end = el.selectionEnd ?? start;
    selectionRef.current = { start, end };
    setCaret(start);
  }

  useLayoutEffect(() => {
    if (!restoreSelectionRef.current) return;
    restoreSelectionRef.current = false;
    const { start, end } = selectionRef.current;
    inputRef.current?.setSelectionRange(start, end);
  });

  // Assigned below, once this render's active engine is known — every
  // function here is only ever CALLED from an event handler (fired well
  // after this render commits), never during render itself, so the
  // temporal gap between "declared" and "assigned" is never observed.
  // handlers (built from these) has to exist before useScriptEngine runs,
  // since each engine's on-screen keyboard wires its keys straight to it.
  let engine!: ScriptEngine;

  function pressLetter(letter: string) {
    engine.pressLetter(letter);
    inputRef.current?.focus();
  }

  function pressSpace() {
    engine.finalize();
    updateText((prev) => prev + " ");
    inputRef.current?.focus();
  }

  function pressZwnj() {
    if (!engine.supportsZwnj) return;
    engine.finalize();
    // Toggle, not append: a ZWNJ right before the cursor almost always means
    // the learner is un-deciding one they just added (a double-tap, or
    // reconsidering right after Shift+Space) — a second one back-to-back has
    // no other reasonable reading, so treat it as "take it back" rather than
    // stacking an invisible second half-space.
    // In isolated mode a letter's own ZWNJ comes off on submit
    // (domain/persian/typedAnswer.ts), so a half-space is a second one: added
    // beside the letter's own, or as a pair after a letter without one (a
    // backspaced one). The one to take back is that second one.
    if (engine.isolatesLetters) {
      updateText((prev) => (prev.endsWith(ZWNJ + ZWNJ) ? prev.slice(0, -1) : prev + (prev.endsWith(ZWNJ) ? ZWNJ : ZWNJ + ZWNJ)));
    } else {
      updateText((prev) => (prev.endsWith(ZWNJ) ? prev.slice(0, -1) : prev + ZWNJ));
    }
    inputRef.current?.focus();
  }

  function backspace() {
    const { start, end } = selectionRef.current;
    if (start !== end) {
      // A selection is deleted as a whole, the same as a native backspace.
      // Engines don't know about selections: their backspace would take
      // the selection plus one more character before it.
      engine.finalize();
      updateText((prev) => prev);
    } else {
      engine.backspace();
    }
    inputRef.current?.focus();
  }

  const handlers: ScriptKeyboardHandlers = { pressLetter, pressSpace, pressZwnj, backspace };
  // `text` for the engines is only what's before the caret: the candidate
  // picker floats over the character just before it, and the kana keyboard's
  // dakuten key modifies that same character.
  engine = useScriptEngine({ keyboardKind, updateText, keyboardMode, disabled, text: text.slice(0, caret), languageInfo, inputWrapRef, handlers, fa, ja, deviceInput });

  const arabicVariantHits = isPersian(courseCode) && exercise.scriptMode === "native" ? detectArabicVariants(text) : [];

  /** The field's text as it's compared: Persian's spelling resolved the same way for an answer and a retype. */
  function typedText() {
    engine.finalize();
    return isPersian(courseCode) ? submittedSpelling(textRef.current, !!engine.isolatesLetters) : textRef.current;
  }

  function submit() {
    // The text stays in the box: the review screen shows this same answer,
    // marked word by word, until the learner moves on.
    const typed = typedText();
    onSubmit(typed, { usedHint });
    setUsedHint(false);
    setHintShown(false);
  }

  /** Practice only: a match moves on, a miss stays to be tried again. Never reaches onSubmit. */
  function submitRetype() {
    if (!retype) return;
    if (retype.matches(typedText())) retype.onContinue();
    else setRetypeWrong(true);
  }

  /**
   * Handles every keystroke for this exercise at the WINDOW level rather
   * than the `<input>`'s own onKeyDown — the input must never lose focus in
   * the first place (see VirtualKey's/SegmentedToggle's mousedown
   * preventDefault), but as a second layer, typing still has to work even
   * if focus ends up somewhere else anyway: every handler above
   * (pressLetter, pressSpace, backspace, ...) edits at the last known caret
   * (selectionRef, see updateText), which doesn't depend on DOM focus — this
   * just has to make sure the keystroke actually reaches that code.
   */
  function handleKeyDown(event: KeyboardEvent) {
    // The review screen around a retype has fields of its own to type in.
    if (retype && isOtherTextField(event.target, inputRef.current)) return;

    const hasModifier = event.ctrlKey || event.metaKey || event.altKey;

    if (!hasModifier && engine.interceptKeyDown?.(event)) {
      event.preventDefault();
      return;
    }

    // About to move the caret (or select, or delete past it): resolve any
    // buffered phonetic input first, while the caret is still where that
    // input belongs. The browser's own default action then moves it.
    if (CARET_KEY.test(event.key) || (hasModifier && event.key.length === 1)) {
      engine.finalize();
      return;
    }

    // Never intercept a browser/OS shortcut (Ctrl/Cmd/Alt-anything) — only
    // Shift is ever part of a combo this exercise itself defines (Shift+Space).
    if (hasModifier) return;

    if (engine.supportsZwnj && event.code === "Space" && event.shiftKey) {
      event.preventDefault();
      pressZwnj();
      return;
    }

    if (event.key === "Enter") {
      // While retyping, Enter is this field's, not the review's Enter-to-
      // continue (useAnswerConfirmation, listening on window after this one
      // — see the capture flag below), which would skip the retype.
      if (retype) event.stopPropagation();
      // Enter belongs to whatever control is focused when that control has
      // its own answer for it — pressing it on "Use a hint" must reveal the
      // hint, not submit the exercise. The answer input itself is the one
      // exception: Enter there IS "submit".
      if (isInteractiveTarget(event.target, inputRef.current)) return;
      event.preventDefault();
      if (textRef.current.trim().length > 0) {
        if (retype) submitRetype();
        else submit();
      }
      return;
    }

    if (!keyboardKind) return; // no script-specific conversion active — plain typing needs the input's own focus, same as any ordinary text field

    if (event.key === "Backspace") {
      // backspace() handles the deletion (or deliberate lack of it) itself —
      // stop the browser's own default deletion from also firing (only
      // matters when the input happens to still have focus; harmless
      // otherwise).
      event.preventDefault();
      backspace();
      return;
    }

    if (event.key === " ") {
      event.preventDefault();
      pressSpace();
      return;
    }

    if (LETTER_KEY.test(event.key) || engine.isExtraPhysicalKey(event.key)) {
      event.preventDefault();
      pressLetter(event.key);
    }
  }

  useEffect(() => {
    if (disabled) return;
    // Capture while retyping, so this runs before useAnswerConfirmation's own
    // window listener and can keep Enter from it.
    const capture = !!retype;
    window.addEventListener("keydown", handleKeyDown, capture);
    return () => window.removeEventListener("keydown", handleKeyDown, capture);
  });

  // A missing word is the accepted answer's own spelling, so it carries the
  // vowel marks content writes — shown only when the learner has those on.
  const reviewedWords = reviewedAnswer
    ? markTypedAnswer(courseCode, exercise.answer, reviewedAnswer.text, reviewedAnswer.correct).map((word) =>
        word.mark === "missing" && !textSettings?.vowelMarks ? { ...word, text: stripReadingAids(word.text) } : word,
      )
    : [];
  const missingWords = reviewedWords.filter((word) => word.mark === "missing").map((word) => word.text);

  return (
    <div className={styles.wrap}>
      <ExercisePrompt
        text={exercise.prompt}
        audio={exercise.promptAudio}
        speaker={exercise.speaker}
        tags={exercise.tags}
        onHintReveal={() => setUsedHint(true)}
        romanization={exercise.promptRomanization}
        courseCode={courseCode}
        autoplayAudio={autoplayAudio}
        hintMap={hintMap}
        textSettings={textSettings}
      />
      {reviewedAnswer && missingWords.length > 0 && (
        <p className={styles.missingNote}>
          Close. Missing words: <bdi>{missingWords.join(" ")}</bdi>
        </p>
      )}
      {reviewedAnswer && (
        // The checked answer, word by word: green where it matches the
        // closest accepted answer, yellow for a swapped pair, red otherwise,
        // and blue for a word it left out (issue #38).
        <div
          className={`${styles.input} ${styles.reviewedInput} ${reviewedAnswer.correct ? styles.reviewedRight : styles.reviewedWrong}`}
          dir={isNativeScript ? languageInfo?.direction : "ltr"}
          style={isNativeScript && languageInfo ? { fontFamily: `var(--font-script-${languageInfo.language})` } : undefined}
          aria-label={`Your answer: ${reviewedAnswer.text || "nothing"}`}
        >
          {reviewedWords.map((word, i) => (
            <span key={i} className={WORD_MARK_CLASS[word.mark]}>
              {word.text}
            </span>
          ))}
        </div>
      )}
      {retype && <p className={styles.note}>Type the correct answer once more to practice it.</p>}
      {(!reviewedAnswer || retype) && (
        <div className={styles.inputWrap} ref={inputWrapRef}>
          <input
            ref={inputRef}
            className={retypeWrong ? `${styles.input} ${styles.reviewedWrong}` : styles.input}
            aria-label={retype ? "Type the correct answer" : undefined}
            aria-invalid={retypeWrong || undefined}
            value={text}
            onChange={(e) => replaceText(e.target.value, e.target.selectionStart ?? e.target.value.length, e.target.selectionEnd ?? undefined)}
            onSelect={syncSelection}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            // A click or tap is about to move the caret: same as CARET_KEY above.
            onPointerDown={() => engine.finalize()}
            disabled={disabled}
            autoFocus
            // A keyboardKind means an on-screen keyboard (engine.keyboardNode)
            // is already doing the typing — the phone's own keyboard popping
            // up on top of it would eat the screen space that keyboard needs
            // and offers no way to type the native script anyway. "none" keeps
            // the input focusable/editable (letters still land here via the
            // handlers above) without triggering the OS keyboard; a plain
            // romanized exercise has no on-screen keyboard, so it keeps the
            // normal one. deviceInput.enabled is the opt-out for that: the
            // on-screen keyboard hides itself too (see scriptEngines.tsx) so
            // the device's own keyboard is the only one shown, not a clutter
            // of both.
            inputMode={keyboardKind && !deviceInput.enabled ? "none" : undefined}
            dir={isNativeScript ? languageInfo?.direction : "ltr"}
            // Font-family only, not the per-script font-SIZE variable —
            // unlike DirectionalText (which wraps arbitrary inline content),
            // this element already has its own base size from
            // Exercise.module.css's .input, and a percentage font-size here
            // would resolve against the inherited size instead of scaling that
            // base, discarding it rather than adjusting it.
            style={isNativeScript && languageInfo ? { fontFamily: `var(--font-script-${languageInfo.language})` } : undefined}
          />
          {/* Only with an on-screen keyboard: without one, letters only reach a
              focused input (see handleKeyDown), so a caret drawn on an unfocused
              one would promise typing that doesn't happen. */}
          {keyboardKind && !inputFocused && !disabled && (
            <VirtualCaret
              inputRef={inputRef}
              wrapRef={inputWrapRef}
              textBeforeCaret={text.slice(0, caret)}
              dir={isNativeScript ? languageInfo?.direction : "ltr"}
              fontFamily={isNativeScript && languageInfo ? `var(--font-script-${languageInfo.language})` : undefined}
            />
          )}
          {engine.overlayNode}
        </div>
      )}
      {retypeWrong && (
        <p className={styles.note} role="status">
          Not quite. Try again, or skip.
        </p>
      )}
      {languageInfo && !isNativeScript && <p className={styles.note}>Type this one in Latin letters (romanized), not the native script.</p>}
      {arabicVariantHits.length > 0 && (
        // API_SPEC.md's Persian-invariants note: "the frontend rejects and
        // teaches" Arabic-only codepoints — a nudge, not a hard block, since
        // the server still normalizes these as a backstop either way.
        <p className={styles.note}>{arabicVariantHits[0].label} — try {arabicVariantHits[0].suggested}</p>
      )}

      {hintShown && exercise.hint && <p className={styles.note}>{exercise.hint}</p>}

      <div className={styles.keyboardBleed}>{engine.keyboardNode}</div>

      <div className={styles.actions}>
        {retype ? (
          // Skip sits just left of Submit, both on Submit's side of the row.
          <div className={styles.retypeActions}>
            <Button variant="secondary" onClick={retype.onContinue}>
              Skip
            </Button>
            <Button onClick={submitRetype} disabled={disabled || text.trim().length === 0}>
              Submit
            </Button>
          </div>
        ) : advance ? (
          <Button onClick={advance.onAdvance}>{advance.label}</Button>
        ) : (
          <>
            {exercise.hint && (
              <button
                type="button"
                className={styles.hint}
                onClick={() => {
                  setUsedHint(true);
                  setHintShown(true);
                }}
                disabled={disabled || hintShown}
              >
                Use a hint
              </button>
            )}
            <Button onClick={submit} disabled={disabled || text.trim().length === 0}>
              Submit
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
