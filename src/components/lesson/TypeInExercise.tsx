import { useRef, useState } from "react";
import { Button } from "../common/Button";
import { PersianKeyboard } from "./PersianKeyboard";
import { getLanguageInfo, isPersian } from "../../domain/language";
import { detectArabicVariants } from "../../domain/persian/normalize";
import type { ExerciseProps } from "./ExerciseRenderer";
import styles from "./Exercise.module.css";

export function TypeInExercise({ exercise, onSubmit, disabled, courseCode, keyboardMode }: ExerciseProps) {
  const [text, setText] = useState("");
  const [usedHint, setUsedHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const languageInfo = getLanguageInfo(courseCode);
  const usesPersianKeyboard = isPersian(courseCode) && exercise.scriptMode === "native";
  const arabicVariantHits = usesPersianKeyboard ? detectArabicVariants(text) : [];

  function submit() {
    onSubmit(text, { usedHint });
    setText("");
    setUsedHint(false);
  }

  function insertAtEnd(fragment: string) {
    setText((prev) => prev + fragment);
    inputRef.current?.focus();
  }

  function backspace() {
    setText((prev) => prev.slice(0, -1));
    inputRef.current?.focus();
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.prompt}>{exercise.prompt}</p>
      <input
        ref={inputRef}
        className={styles.input}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && text.trim().length > 0) submit();
        }}
        disabled={disabled}
        autoFocus
        dir={languageInfo?.direction}
        style={languageInfo ? { fontFamily: languageInfo.nativeFontStack } : undefined}
      />
      {arabicVariantHits.length > 0 && (
        // API_SPEC.md's Persian-invariants note: "the frontend rejects and
        // teaches" Arabic-only codepoints — a nudge, not a hard block, since
        // the server still normalizes these as a backstop either way.
        <p className={styles.note}>{arabicVariantHits[0].label} — try {arabicVariantHits[0].suggested}</p>
      )}
      {usesPersianKeyboard && (
        <PersianKeyboard onInsert={insertAtEnd} onBackspace={backspace} keyboardMode={keyboardMode ?? "contextual"} />
      )}
      <div className={styles.actions}>
        <button type="button" className={styles.hint} onClick={() => setUsedHint(true)} disabled={disabled}>
          Use a hint
        </button>
        <Button onClick={submit} disabled={disabled || text.trim().length === 0}>
          Check
        </Button>
      </div>
    </div>
  );
}
