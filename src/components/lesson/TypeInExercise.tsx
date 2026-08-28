import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Button } from "../common/Button";
import { PersianKeyboard } from "./PersianKeyboard";
import { PersianPhoneticKeyboard } from "./PersianPhoneticKeyboard";
import { JapanesePhoneticKeyboard } from "./JapanesePhoneticKeyboard";
import { JapaneseKanaKeyboard } from "./JapaneseKanaKeyboard";
import { KeyboardModeToggle } from "./keyboard/KeyboardModeToggle";
import { PhoneticCandidatePicker } from "./PhoneticCandidatePicker";
import { getLanguageInfo, getKeyboardKind, isPersian } from "../../domain/language";
import { detectArabicVariants } from "../../domain/persian/normalize";
import { PHYSICAL_KEY_TO_ISIRI } from "../../domain/persian/isiriLayout";
import { LATIN_TO_KANA } from "../../domain/japanese/jisKanaLayout";
import { useKeyboardInputMethod } from "../../hooks/useKeyboardInputMethod";
import { usePersianPhoneticInput, handlePickerNavigation } from "../../hooks/usePersianPhoneticInput";
import { useJapanesePhoneticInput } from "../../hooks/useJapanesePhoneticInput";
import type { ExerciseProps } from "./ExerciseRenderer";
import styles from "./Exercise.module.css";

const ZWNJ = "‌";
const LETTER_KEY = /^[a-zA-Z']$/;
// Six ISIRI letters (ج چ ک گ و ژ) sit on the extremity punctuation keys
// rather than a letter key — only relevant in "persian-layout" mode, since
// that's the only mode PHYSICAL_KEY_TO_ISIRI covers.
const ISIRI_PUNCTUATION_KEY = /^[[\];,.]$/;

export function TypeInExercise({ exercise, onSubmit, disabled, courseCode, keyboardMode, advance }: ExerciseProps) {
  const [text, setText] = useState("");
  const [usedHint, setUsedHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Mirrors `text` synchronously (state updates are batched/async, but
  // submit() needs the just-finalized value immediately — see submit()) —
  // every mutation goes through updateText so the two never drift.
  const textRef = useRef("");

  // For floating the Persian candidate picker directly above the letter it
  // corrects: a hidden span mirroring the input's own text/font is measured
  // to find that letter's on-screen position (see the layout effect below).
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const lastCharRef = useRef<HTMLSpanElement>(null);
  const [pickerStyle, setPickerStyle] = useState<CSSProperties | null>(null);

  const languageInfo = getLanguageInfo(courseCode);
  const fa = useKeyboardInputMethod("fa");
  const ja = useKeyboardInputMethod("ja");
  const keyboardKind =
    languageInfo && exercise.scriptMode === "native"
      ? getKeyboardKind(courseCode, exercise.scriptMode, { fa: fa.method, ja: ja.method })
      : null;

  // Both engines are always instantiated (hooks can't be called
  // conditionally) but only the one matching `keyboardKind` is ever fed a
  // character — the shared instance is what lets tapping the on-screen
  // keyboard and typing on a physical one interleave correctly mid-word.
  const persianPhonetic = usePersianPhoneticInput((deleteCount, insertText) =>
    updateText((prev) => prev.slice(0, prev.length - deleteCount) + insertText),
  );
  const japanesePhonetic = useJapanesePhoneticInput((deleteCount, insertText) =>
    updateText((prev) => prev.slice(0, prev.length - deleteCount) + insertText),
  );

  const arabicVariantHits = isPersian(courseCode) && exercise.scriptMode === "native" ? detectArabicVariants(text) : [];

  useLayoutEffect(() => {
    if (!persianPhonetic.candidates || !inputWrapRef.current || !lastCharRef.current) {
      setPickerStyle(null);
      return;
    }
    const containerRect = inputWrapRef.current.getBoundingClientRect();
    const charRect = lastCharRef.current.getBoundingClientRect();
    setPickerStyle({
      position: "absolute",
      left: charRect.left - containerRect.left + charRect.width / 2,
      top: charRect.top - containerRect.top,
      transform: "translate(-50%, -100%) translateY(-6px)",
    });
  }, [persianPhonetic.candidates, text]);

  function updateText(updater: (prev: string) => string) {
    textRef.current = updater(textRef.current);
    setText(textRef.current);
  }

  function submit() {
    if (keyboardKind === "persian-phonetic") persianPhonetic.finalize();
    else if (keyboardKind === "japanese-phonetic") japanesePhonetic.finalize();
    onSubmit(textRef.current, { usedHint });
    updateText(() => "");
    setUsedHint(false);
  }

  function pressLetter(letter: string) {
    if (keyboardKind === "persian-layout") {
      const mapped = PHYSICAL_KEY_TO_ISIRI[letter.toLowerCase()];
      updateText((prev) => prev + (mapped ?? letter) + (mapped && keyboardMode === "isolated" ? ZWNJ : ""));
    } else if (keyboardKind === "persian-phonetic") {
      persianPhonetic.feedChar(letter);
    } else if (keyboardKind === "japanese-phonetic") {
      japanesePhonetic.feedChar(letter);
    } else if (keyboardKind === "japanese-kana") {
      const mapped = LATIN_TO_KANA[letter.toLowerCase()];
      updateText((prev) => prev + (mapped ?? letter));
    } else {
      updateText((prev) => prev + letter);
    }
    inputRef.current?.focus();
  }

  function pressZwnj() {
    if (keyboardKind === "persian-phonetic") persianPhonetic.finalize();
    updateText((prev) => prev + ZWNJ);
    inputRef.current?.focus();
  }

  function pressSpace() {
    if (keyboardKind === "persian-phonetic") persianPhonetic.finalize();
    else if (keyboardKind === "japanese-phonetic") japanesePhonetic.finalize();
    updateText((prev) => prev + " ");
    inputRef.current?.focus();
  }

  /** True when the current phonetic buffer (if any) has nothing visible in the text yet — cancelling it on backspace should NOT also delete a real character. */
  function hasInvisiblePending(): boolean {
    if (keyboardKind === "persian-phonetic") return persianPhonetic.hasPending();
    if (keyboardKind === "japanese-phonetic") {
      const buffered = japanesePhonetic.peekBuffer();
      return buffered !== "" && buffered !== "n"; // "n" has a real ｎ placeholder already in the text
    }
    return false;
  }

  function backspace() {
    const invisible = hasInvisiblePending();
    // Always reset on backspace, even when nothing was invisibly pending:
    // an eagerly-inserted letter (see phoneticEngine.ts) that's about to be
    // deleted must not be left "open" for a later keystroke to retroactively
    // correct into a digraph — that letter is gone, the buffer should be too.
    if (keyboardKind === "persian-phonetic") persianPhonetic.reset();
    else if (keyboardKind === "japanese-phonetic") japanesePhonetic.reset();

    if (!invisible) updateText((prev) => prev.slice(0, -1));
    inputRef.current?.focus();
  }

  function replaceLastChar(newLastChar: string) {
    updateText((prev) => (prev.length === 0 ? prev : prev.slice(0, -1) + newLastChar));
    inputRef.current?.focus();
  }

  /**
   * Handles every keystroke for this exercise at the WINDOW level rather
   * than the `<input>`'s own onKeyDown — the input must never lose focus in
   * the first place (see VirtualKey's/KeyboardModeToggle's mousedown
   * preventDefault), but as a second layer, typing still has to work even
   * if focus ends up somewhere else anyway: every handler below
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

    // An open candidate picker is a modal-like choice — Enter/Escape/arrows
    // resolve THAT, not the exercise, so this has to run before the plain
    // Enter-submits check below.
    if (keyboardKind === "persian-phonetic" && handlePickerNavigation(persianPhonetic, event.key)) {
      event.preventDefault();
      return;
    }

    if ((keyboardKind === "persian-layout" || keyboardKind === "persian-phonetic") && event.code === "Space" && event.shiftKey) {
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

    if (LETTER_KEY.test(event.key) || (keyboardKind === "persian-layout" && ISIRI_PUNCTUATION_KEY.test(event.key))) {
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
      <p className={styles.prompt}>{exercise.prompt}</p>
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
        {persianPhonetic.candidates && (
          <>
            {/* Invisible twin of the input's text, used only to measure where the last (correctable) character sits on screen. */}
            <span className={`${styles.input} ${styles.mirror}`} aria-hidden="true" dir={languageInfo?.direction} style={languageInfo ? { fontFamily: languageInfo.nativeFontStack } : undefined}>
              <span>{text.slice(0, -1)}</span>
              <span ref={lastCharRef}>{text.slice(-1) || "​"}</span>
            </span>
            <PhoneticCandidatePicker
              candidates={persianPhonetic.candidates}
              activeIndex={persianPhonetic.activeIndex}
              onSelect={persianPhonetic.selectCandidate}
              style={pickerStyle ?? undefined}
            />
          </>
        )}
      </div>
      {arabicVariantHits.length > 0 && (
        // API_SPEC.md's Persian-invariants note: "the frontend rejects and
        // teaches" Arabic-only codepoints — a nudge, not a hard block, since
        // the server still normalizes these as a backstop either way.
        <p className={styles.note}>{arabicVariantHits[0].label} — try {arabicVariantHits[0].suggested}</p>
      )}

      {keyboardKind === "persian-layout" && (
        <>
          <KeyboardModeToggle
            options={[
              { value: "layout", label: "Layout" },
              { value: "phonetic", label: "Phonetic" },
            ]}
            value={fa.method}
            onChange={fa.setInputMethod}
            disabled={disabled}
          />
          <PersianKeyboard
            onInsert={(fragment) => updateText((prev) => prev + fragment)}
            onBackspace={backspace}
            keyboardMode={keyboardMode ?? "contextual"}
            disabled={disabled}
          />
        </>
      )}
      {keyboardKind === "persian-phonetic" && (
        <>
          <KeyboardModeToggle
            options={[
              { value: "layout", label: "Layout" },
              { value: "phonetic", label: "Phonetic" },
            ]}
            value={fa.method}
            onChange={fa.setInputMethod}
            disabled={disabled}
          />
          <PersianPhoneticKeyboard onPressLetter={pressLetter} onZwnj={pressZwnj} onSpace={pressSpace} onBackspace={backspace} disabled={disabled} />
        </>
      )}
      {keyboardKind === "japanese-phonetic" && (
        <>
          <KeyboardModeToggle
            options={[
              { value: "phonetic", label: "Phonetic" },
              { value: "kana", label: "Kana layout" },
            ]}
            value={ja.method}
            onChange={ja.setInputMethod}
            disabled={disabled}
          />
          <JapanesePhoneticKeyboard onPressLetter={pressLetter} onSpace={pressSpace} onBackspace={backspace} disabled={disabled} />
        </>
      )}
      {keyboardKind === "japanese-kana" && (
        <>
          <KeyboardModeToggle
            options={[
              { value: "phonetic", label: "Phonetic" },
              { value: "kana", label: "Kana layout" },
            ]}
            value={ja.method}
            onChange={ja.setInputMethod}
            disabled={disabled}
          />
          <JapaneseKanaKeyboard
            lastChar={text.slice(-1)}
            onInsert={(fragment) => updateText((prev) => prev + fragment)}
            onReplaceLast={replaceLastChar}
            onBackspace={backspace}
            disabled={disabled}
          />
        </>
      )}

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
