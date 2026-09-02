// One ScriptEngine per KeyboardKind (plus "none" for a plain, non-native
// exercise) — the single seam TypeInExercise dispatches every keyboard-
// specific behavior through, instead of an if/else chain repeated in every
// handler (pressLetter, backspace, submit, handleKeyDown, render, ...).
// Adding a new on-screen keyboard means writing one new engine here and
// adding it to useScriptEngines' returned map — nothing in TypeInExercise
// itself needs to change.
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { SegmentedToggle } from "../../common/SegmentedToggle";
import { PersianKeyboard } from "../PersianKeyboard";
import { PersianPhoneticKeyboard } from "../PersianPhoneticKeyboard";
import { JapanesePhoneticKeyboard } from "../JapanesePhoneticKeyboard";
import { JapaneseKanaKeyboard } from "../JapaneseKanaKeyboard";
import { PhoneticCandidatePicker } from "../PhoneticCandidatePicker";
import { hasPhoneticValue } from "../../../domain/persian/phoneticMap";
import { PHYSICAL_KEY_TO_ISIRI } from "../../../domain/persian/isiriLayout";
import { PHYSICAL_CHAR_TO_KANA } from "../../../domain/japanese/jisKanaLayout";
import { usePersianPhoneticInput, handlePickerNavigation } from "../../../hooks/usePersianPhoneticInput";
import { useJapanesePhoneticInput } from "../../../hooks/useJapanesePhoneticInput";
import type { useKeyboardInputMethod } from "../../../hooks/useKeyboardInputMethod";
import type { getLanguageInfo } from "../../../domain/language";

type FaInputMethod = ReturnType<typeof useKeyboardInputMethod<"fa">>;
type JaInputMethod = ReturnType<typeof useKeyboardInputMethod<"ja">>;
import styles from "../Exercise.module.css";

export const ZWNJ = "‌";

type UpdateText = (updater: (prev: string) => string) => void;
type LanguageInfo = ReturnType<typeof getLanguageInfo>;

/**
 * The shared, refocus-after-every-action handlers TypeInExercise builds
 * around whichever engine ends up active this render — every engine's JSX
 * below wires its on-screen keys to these directly (the same functions a
 * physical keystroke goes through), the same way the pre-refactor version
 * passed its own local pressLetter/pressSpace/... straight into JSX props.
 * Passed in (rather than called back into from a method invoked during
 * render) specifically so building an engine's keyboardNode/overlayNode is
 * plain JSX construction, not a function call closing over refs — the
 * pattern React's ref-safety check requires to prove nothing reads
 * inputRef.current during render itself.
 */
export interface ScriptKeyboardHandlers {
  pressLetter: (letter: string) => void;
  pressSpace: () => void;
  pressZwnj: () => void;
  backspace: () => void;
}

export interface ScriptEngine {
  /** Feed one Latin character — from a physical keystroke or a tap on the on-screen keyboard. */
  pressLetter(letter: string): void;
  /** Handles the deletion itself, including cancelling any buffered state that has nothing visible in the text yet (so a plain slice(-1) doesn't also eat a real character). */
  backspace(): void;
  /** Call at a word/answer boundary (submit, space, zwnj) — resolves any buffered state. A no-op for engines with nothing to buffer. */
  finalize(): void;
  /** True for a physical key (beyond a-zA-Z') this engine's own on-screen keyboard also uses, e.g. Japanese kana's number row. */
  isExtraPhysicalKey(key: string): boolean;
  /** Whether Shift+Space (half-space) applies to this engine. */
  supportsZwnj: boolean;
  /** First look at a keydown before the generic Enter/Backspace/Space handling — return true to say "fully handled, stop here" (e.g. arrow/Enter/Escape navigating an open candidate picker). */
  interceptKeyDown?(event: KeyboardEvent): boolean;
  /** The mode toggle plus on-screen keyboard for this engine, or null to show none. Already-built JSX (see the interface doc above), not a function to call. */
  keyboardNode: ReactNode;
  /** Anything rendered over/beside the answer input itself (a candidate picker, a pending-conversion indicator). */
  overlayNode: ReactNode;
}

function createPlainEngine(updateText: UpdateText): ScriptEngine {
  return {
    pressLetter(letter) {
      updateText((prev) => prev + letter);
    },
    backspace() {
      updateText((prev) => prev.slice(0, -1));
    },
    finalize() {},
    isExtraPhysicalKey: () => false,
    supportsZwnj: false,
    keyboardNode: null,
    overlayNode: null,
  };
}

// Six ISIRI letters (ج چ ک گ و ژ) sit on the extremity punctuation keys
// rather than a letter key.
const ISIRI_PUNCTUATION_KEY = /^[[\];,.]$/;

function usePersianLayoutEngine(params: {
  updateText: UpdateText;
  keyboardMode: "contextual" | "isolated" | undefined;
  disabled: boolean | undefined;
  handlers: ScriptKeyboardHandlers;
  fa: FaInputMethod;
}): ScriptEngine {
  const { updateText, keyboardMode, disabled, handlers, fa } = params;

  return {
    pressLetter(letter) {
      const mapped = PHYSICAL_KEY_TO_ISIRI[letter.toLowerCase()];
      updateText((prev) => prev + (mapped ?? letter) + (mapped && keyboardMode === "isolated" ? ZWNJ : ""));
    },
    backspace() {
      updateText((prev) => prev.slice(0, -1));
    },
    finalize() {},
    isExtraPhysicalKey: (key) => ISIRI_PUNCTUATION_KEY.test(key),
    supportsZwnj: true,
    keyboardNode: (
      <>
        <SegmentedToggle
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
          onBackspace={handlers.backspace}
          keyboardMode={keyboardMode ?? "contextual"}
          disabled={disabled}
        />
      </>
    ),
    overlayNode: null,
  };
}

function usePersianPhoneticEngine(params: {
  updateText: UpdateText;
  disabled: boolean | undefined;
  text: string;
  languageInfo: LanguageInfo;
  inputWrapRef: React.RefObject<HTMLDivElement | null>;
  handlers: ScriptKeyboardHandlers;
  fa: FaInputMethod;
}): ScriptEngine {
  const { updateText, disabled, text, languageInfo, inputWrapRef, handlers, fa } = params;
  const persianPhonetic = usePersianPhoneticInput((deleteCount, insertText) =>
    updateText((prev) => prev.slice(0, prev.length - deleteCount) + insertText),
  );

  // Floats the candidate picker directly above the letter it corrects: a
  // hidden span mirroring the input's own text/font is measured to find
  // that letter's on-screen position.
  const lastCharRef = useRef<HTMLSpanElement>(null);
  const [pickerStyle, setPickerStyle] = useState<CSSProperties | null>(null);

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
  }, [persianPhonetic.candidates, text, inputWrapRef]);

  return {
    pressLetter(letter) {
      // Letters with no Persian phonetic mapping ("c" alone, mid-digraph
      // with nothing else typed yet) are never accepted — matches the
      // on-screen keyboard greying that key out, so typing it physically
      // can't silently do nothing either.
      if (hasPhoneticValue(letter)) persianPhonetic.feedChar(letter);
    },
    backspace() {
      const invisible = persianPhonetic.hasPending();
      // Always reset, even when nothing was invisibly pending: an eagerly-
      // inserted letter (see phoneticEngine.ts) that's about to be deleted
      // must not be left "open" for a later keystroke to retroactively
      // correct into a digraph — that letter is gone, the buffer should be too.
      persianPhonetic.reset();
      if (!invisible) updateText((prev) => prev.slice(0, -1));
    },
    finalize() {
      persianPhonetic.finalize();
    },
    isExtraPhysicalKey: () => false,
    supportsZwnj: true,
    interceptKeyDown(event) {
      // An open candidate picker is a modal-like choice — Enter/Escape/
      // arrows resolve THAT, not the exercise.
      return handlePickerNavigation(persianPhonetic, event.key);
    },
    keyboardNode: (
      <>
        <SegmentedToggle
          options={[
            { value: "layout", label: "Layout" },
            { value: "phonetic", label: "Phonetic" },
          ]}
          value={fa.method}
          onChange={fa.setInputMethod}
          disabled={disabled}
        />
        <PersianPhoneticKeyboard
          onPressLetter={handlers.pressLetter}
          onZwnj={handlers.pressZwnj}
          onSpace={handlers.pressSpace}
          onBackspace={handlers.backspace}
          disabled={disabled}
        />
      </>
    ),
    overlayNode: !persianPhonetic.candidates ? null : (
      <>
        {/* Invisible twin of the input's text, used only to measure where the last (correctable) character sits on screen. */}
        <span
          className={`${styles.input} ${styles.mirror}`}
          aria-hidden="true"
          dir={languageInfo?.direction}
          style={languageInfo ? { fontFamily: languageInfo.nativeFontStack } : undefined}
        >
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
    ),
  };
}

function useJapanesePhoneticEngine(params: {
  updateText: UpdateText;
  disabled: boolean | undefined;
  handlers: ScriptKeyboardHandlers;
  ja: JaInputMethod;
}): ScriptEngine {
  const { updateText, disabled, handlers, ja } = params;
  const japanesePhonetic = useJapanesePhoneticInput((deleteCount, insertText) =>
    updateText((prev) => prev.slice(0, prev.length - deleteCount) + insertText),
  );

  return {
    pressLetter(letter) {
      japanesePhonetic.feedChar(letter);
    },
    backspace() {
      const buffered = japanesePhonetic.peekBuffer();
      const invisible = buffered !== "" && buffered !== "n"; // "n" has a real ｎ placeholder already in the text
      japanesePhonetic.reset();
      if (!invisible) updateText((prev) => prev.slice(0, -1));
    },
    finalize() {
      japanesePhonetic.finalize();
    },
    isExtraPhysicalKey: () => false,
    supportsZwnj: false,
    keyboardNode: (
      <>
        <SegmentedToggle
          options={[
            { value: "phonetic", label: "Phonetic" },
            { value: "kana", label: "Kana layout" },
          ]}
          value={ja.method}
          onChange={ja.setInputMethod}
          disabled={disabled}
        />
        <JapanesePhoneticKeyboard onPressLetter={handlers.pressLetter} onSpace={handlers.pressSpace} onBackspace={handlers.backspace} disabled={disabled} />
      </>
    ),
    // The buffer isn't in the answer text yet — it's a consonant (cluster)
    // still waiting on a vowel to resolve into kana ("k" before
    // ka/ki/ku/ke/ko, "ky" before kya/kyu/kyo). Shown as plain Latin so the
    // learner sees what they typed while conversion is still being decided,
    // instead of nothing happening. Excludes "n", which already has its own
    // visible ｎ placeholder in the text.
    overlayNode:
      japanesePhonetic.buffer && japanesePhonetic.buffer !== "n" ? <span className={styles.pendingRomaji}>{japanesePhonetic.buffer}</span> : null,
  };
}

// The JIS kana number row (あうえお/やゆよわ/ほへー) sits on digit and
// punctuation keys rather than letter keys.
const KANA_NUMBER_ROW_KEY = /^[0-9=\\-]$/;

function useJapaneseKanaEngine(params: {
  updateText: UpdateText;
  disabled: boolean | undefined;
  text: string;
  handlers: ScriptKeyboardHandlers;
  ja: JaInputMethod;
}): ScriptEngine {
  const { updateText, disabled, text, handlers, ja } = params;

  return {
    pressLetter(letter) {
      const mapped = PHYSICAL_CHAR_TO_KANA[letter.toLowerCase()];
      updateText((prev) => prev + (mapped ?? letter));
    },
    backspace() {
      updateText((prev) => prev.slice(0, -1));
    },
    finalize() {},
    isExtraPhysicalKey: (key) => KANA_NUMBER_ROW_KEY.test(key),
    supportsZwnj: false,
    keyboardNode: (
      <>
        <SegmentedToggle
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
          onReplaceLast={(newLastChar) => updateText((prev) => (prev.length === 0 ? prev : prev.slice(0, -1) + newLastChar))}
          onBackspace={handlers.backspace}
          disabled={disabled}
        />
      </>
    ),
    overlayNode: null,
  };
}

/**
 * Builds all four script engines every render (hooks can't be called
 * conditionally) plus the plain fallback, and returns the one matching
 * `keyboardKind` — the same "always instantiate, only feed the active one"
 * shape the old per-hook version used, just uniform across every keyboard
 * kind instead of special-cased per kind.
 */
export function useScriptEngine(params: {
  keyboardKind: "persian-layout" | "persian-phonetic" | "japanese-phonetic" | "japanese-kana" | null;
  updateText: UpdateText;
  keyboardMode: "contextual" | "isolated" | undefined;
  disabled: boolean | undefined;
  text: string;
  languageInfo: LanguageInfo;
  inputWrapRef: React.RefObject<HTMLDivElement | null>;
  handlers: ScriptKeyboardHandlers;
  fa: FaInputMethod;
  ja: JaInputMethod;
}): ScriptEngine {
  const { keyboardKind, updateText, keyboardMode, disabled, text, languageInfo, inputWrapRef, handlers, fa, ja } = params;

  const plain = createPlainEngine(updateText);
  const persianLayout = usePersianLayoutEngine({ updateText, keyboardMode, disabled, handlers, fa });
  const persianPhonetic = usePersianPhoneticEngine({ updateText, disabled, text, languageInfo, inputWrapRef, handlers, fa });
  const japanesePhonetic = useJapanesePhoneticEngine({ updateText, disabled, handlers, ja });
  const japaneseKana = useJapaneseKanaEngine({ updateText, disabled, text, handlers, ja });

  switch (keyboardKind) {
    case "persian-layout":
      return persianLayout;
    case "persian-phonetic":
      return persianPhonetic;
    case "japanese-phonetic":
      return japanesePhonetic;
    case "japanese-kana":
      return japaneseKana;
    default:
      return plain;
  }
}
