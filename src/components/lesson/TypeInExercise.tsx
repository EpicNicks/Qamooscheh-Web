import { useEffect, useRef, useState } from "react";
import { Button } from "../common/Button";
import { useScriptEngine, ZWNJ, type ScriptEngine, type ScriptKeyboardHandlers } from "./keyboard/scriptEngines";
import { ExercisePrompt } from "./ExercisePrompt";
import { getLanguageInfo, getKeyboardKind, isPersian } from "../../domain/language";
import { detectArabicVariants } from "../../domain/persian/normalize";
import { useKeyboardInputMethod } from "../../hooks/useKeyboardInputMethod";
import type { ExerciseProps } from "./ExerciseRenderer";
import styles from "./Exercise.module.css";

const LETTER_KEY = /^[a-zA-Z']$/;

/**
 * Every keyboard-kind-specific behavior (which letters are valid, how
 * backspace/space/zwnj/submit resolve buffered state, which on-screen
 * keyboard and input overlay to show) lives behind the single ScriptEngine
 * this component asks for — see keyboard/scriptEngines.tsx. Adding a new
 * keyboard kind means writing one engine there; nothing here changes.
 */
export function TypeInExercise({ exercise, onSubmit, disabled, courseCode, keyboardMode, autoplayAudio, advance }: ExerciseProps) {
  const [text, setText] = useState("");
  const [usedHint, setUsedHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Mirrors `text` synchronously (state updates are batched/async, but
  // submit() needs the just-finalized value immediately — see submit()) —
  // every mutation goes through updateText so the two never drift.
  const textRef = useRef("");

  const inputWrapRef = useRef<HTMLDivElement>(null);

  const languageInfo = getLanguageInfo(courseCode);
  // Still read here (rather than inside the engine) because it also decides
  // which engine to ask for in the first place.
  const fa = useKeyboardInputMethod("fa");
  const ja = useKeyboardInputMethod("ja");
  const keyboardKind =
    languageInfo && exercise.scriptMode === "native"
      ? getKeyboardKind(courseCode, exercise.scriptMode, { fa: fa.method, ja: ja.method })
      : null;

  function updateText(updater: (prev: string) => string) {
    textRef.current = updater(textRef.current);
    setText(textRef.current);
  }

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
    updateText((prev) => prev + ZWNJ);
    inputRef.current?.focus();
  }

  function backspace() {
    engine.backspace();
    inputRef.current?.focus();
  }

  const handlers: ScriptKeyboardHandlers = { pressLetter, pressSpace, pressZwnj, backspace };
  engine = useScriptEngine({ keyboardKind, updateText, keyboardMode, disabled, text, languageInfo, inputWrapRef, handlers, fa, ja });

  const arabicVariantHits = isPersian(courseCode) && exercise.scriptMode === "native" ? detectArabicVariants(text) : [];

  function submit() {
    engine.finalize();
    onSubmit(textRef.current, { usedHint });
    updateText(() => "");
    setUsedHint(false);
  }

  /**
   * Handles every keystroke for this exercise at the WINDOW level rather
   * than the `<input>`'s own onKeyDown — the input must never lose focus in
   * the first place (see VirtualKey's/SegmentedToggle's mousedown
   * preventDefault), but as a second layer, typing still has to work even
   * if focus ends up somewhere else anyway: every handler above
   * (pressLetter, pressSpace, backspace, ...) already appends/edits via
   * `prev => prev + x`, never reading a cursor/selection position, so
   * "process it and add it to the end of the string" falls out of the
   * existing append-only design for free — this just has to make sure the
   * keystroke actually reaches that code regardless of DOM focus.
   */
  function handleKeyDown(event: KeyboardEvent) {
    // Never intercept a browser/OS shortcut (Ctrl/Cmd/Alt-anything) — only
    // Shift is ever part of a combo this exercise itself defines (Shift+Space).
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (engine.interceptKeyDown?.(event)) {
      event.preventDefault();
      return;
    }

    if (engine.supportsZwnj && event.code === "Space" && event.shiftKey) {
      event.preventDefault();
      pressZwnj();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (textRef.current.trim().length > 0) submit();
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
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div className={styles.wrap}>
      <ExercisePrompt text={exercise.prompt} courseCode={courseCode} autoplayAudio={autoplayAudio} />
      <div className={styles.inputWrap} ref={inputWrapRef}>
        <input
          ref={inputRef}
          className={styles.input}
          value={text}
          onChange={(e) => updateText(() => e.target.value)}
          disabled={disabled}
          autoFocus
          dir={languageInfo?.direction}
          style={languageInfo ? { fontFamily: languageInfo.nativeFontStack } : undefined}
        />
        {engine.overlayNode}
      </div>
      {arabicVariantHits.length > 0 && (
        // API_SPEC.md's Persian-invariants note: "the frontend rejects and
        // teaches" Arabic-only codepoints — a nudge, not a hard block, since
        // the server still normalizes these as a backstop either way.
        <p className={styles.note}>{arabicVariantHits[0].label} — try {arabicVariantHits[0].suggested}</p>
      )}

      {engine.keyboardNode}

      <div className={styles.actions}>
        {advance ? (
          <Button onClick={advance.onAdvance}>{advance.label}</Button>
        ) : (
          <>
            <button type="button" className={styles.hint} onClick={() => setUsedHint(true)} disabled={disabled}>
              Use a hint
            </button>
            <Button onClick={submit} disabled={disabled || text.trim().length === 0}>
              Submit
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
