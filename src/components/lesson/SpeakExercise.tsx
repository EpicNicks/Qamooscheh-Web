import { useState } from "react";
import { Button } from "../common/Button";
import { ExercisePrompt } from "./ExercisePrompt";
import { getLanguageInfo } from "../../domain/language";
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
export function SpeakExercise({ exercise, onSubmit, disabled, courseCode, autoplayAudio, advance }: ExerciseProps) {
  const [text, setText] = useState("");
  const languageInfo = getLanguageInfo(courseCode);

  function submit() {
    onSubmit(text);
    setText("");
  }

  return (
    <div className={styles.wrap}>
      <ExercisePrompt text={exercise.prompt} courseCode={courseCode} autoplayAudio={autoplayAudio} />
      <p className={styles.note}>Speech capture isn't wired up yet — type what you'd say.</p>
      <input
        className={styles.input}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        autoFocus
        dir={languageInfo?.direction}
        style={languageInfo ? { fontFamily: languageInfo.nativeFontStack } : undefined}
      />
      {advance ? (
        <Button onClick={advance.onAdvance}>{advance.label}</Button>
      ) : (
        <Button onClick={submit} disabled={disabled || text.trim().length === 0}>
          Submit
        </Button>
      )}
    </div>
  );
}
