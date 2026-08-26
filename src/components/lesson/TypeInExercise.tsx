import { useState } from "react";
import { Button } from "../common/Button";
import type { ExerciseProps } from "./ExerciseRenderer";
import styles from "./Exercise.module.css";

export function TypeInExercise({ exercise, onSubmit, disabled }: ExerciseProps) {
  const [text, setText] = useState("");
  const [usedHint, setUsedHint] = useState(false);

  function submit() {
    onSubmit(text, { usedHint });
    setText("");
    setUsedHint(false);
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.prompt}>{exercise.prompt}</p>
      <input
        className={styles.input}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && text.trim().length > 0) submit();
        }}
        disabled={disabled}
        autoFocus
        // Native/romanized keyboarding (per-language input handling,
        // user_prefs.keyboard_mode) is a Persian/Japanese-specific concern —
        // deliberately left as a plain text input in this general pass.
      />
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
