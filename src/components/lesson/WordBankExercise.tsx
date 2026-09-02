import { useEffect, useState } from "react";
import { Button } from "../common/Button";
import { DirectionalText } from "../common/DirectionalText";
import { ExercisePrompt } from "./ExercisePrompt";
import type { ExerciseProps } from "./ExerciseRenderer";
import styles from "./Exercise.module.css";

/** Tap tiles in order to build the answer; tapping a chosen tile again removes it. */
export function WordBankExercise({ exercise, onSubmit, disabled, courseCode, autoplayAudio, advance }: ExerciseProps) {
  const [chosen, setChosen] = useState<number[]>([]);
  const tiles = exercise.tiles ?? [];

  function toggle(tileIndex: number) {
    setChosen((prev) =>
      prev.includes(tileIndex) ? prev.filter((i) => i !== tileIndex) : [...prev, tileIndex],
    );
  }

  function submit() {
    onSubmit(chosen.map((i) => tiles[i]).join(" "));
    setChosen([]);
  }

  // Enter submits, the same as TypeInExercise's own window-level handling —
  // tapping tiles never focuses a text input, so there's nothing for a
  // native "Enter activates the focused control" behavior to land on
  // otherwise. Skipped while `advance` is set: at that point the exercise
  // is the disabled post-answer review, and useAnswerConfirmation's own
  // page-level Enter handling (wired to the Continue button) already owns
  // the key then.
  useEffect(() => {
    if (disabled || advance) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter") {
        event.preventDefault();
        if (chosen.length > 0) submit();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className={styles.wrap}>
      <ExercisePrompt text={exercise.prompt} courseCode={courseCode} autoplayAudio={autoplayAudio} />
      <div className={styles.answerRow}>
        {chosen.map((tileIndex, position) => (
          <DirectionalText key={`${tileIndex}-${position}`} courseCode={courseCode}>
            <button type="button" className={styles.tile} onClick={() => toggle(tileIndex)} disabled={disabled}>
              {tiles[tileIndex]}
            </button>
          </DirectionalText>
        ))}
      </div>
      <div className={styles.tiles}>
        {tiles.map((tile, tileIndex) =>
          chosen.includes(tileIndex) ? null : (
            <DirectionalText key={tileIndex} courseCode={courseCode}>
              <button type="button" className={styles.tile} onClick={() => toggle(tileIndex)} disabled={disabled}>
                {tile}
              </button>
            </DirectionalText>
          ),
        )}
      </div>
      {advance ? (
        <Button onClick={advance.onAdvance}>{advance.label}</Button>
      ) : (
        <Button onClick={submit} disabled={disabled || chosen.length === 0}>
          Submit
        </Button>
      )}
    </div>
  );
}
