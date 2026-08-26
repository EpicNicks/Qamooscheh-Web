import { useState } from "react";
import { Button } from "../common/Button";
import type { ExerciseProps } from "./ExerciseRenderer";
import styles from "./Exercise.module.css";

/**
 * Stub. `speak` exercises need microphone capture + speech-to-text before
 * there's any `submittedText` to send — nothing in API_SPEC.md's read so far
 * specifies that pipeline (client-side ASR vs. a server endpoint), so this
 * renders the prompt and lets the learner type what they'd have said instead
 * of blocking the lesson on unbuilt infrastructure. Replace the input with
 * real audio capture once that pipeline is decided.
 */
export function SpeakExercise({ exercise, onSubmit, disabled }: ExerciseProps) {
  const [text, setText] = useState("");

  function submit() {
    onSubmit(text);
    setText("");
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.prompt}>{exercise.prompt}</p>
      <p className={styles.note}>Speech capture isn't wired up yet — type what you'd say.</p>
      <input
        className={styles.input}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        autoFocus
      />
      <Button onClick={submit} disabled={disabled || text.trim().length === 0}>
        Check
      </Button>
    </div>
  );
}
