import { useState } from "react";
import { Button } from "../common/Button";
import { DirectionalText } from "../common/DirectionalText";
import type { ExerciseProps } from "./ExerciseRenderer";
import styles from "./Exercise.module.css";

/** Tap tiles in order to build the answer; tapping a chosen tile again removes it. */
export function WordBankExercise({ exercise, onSubmit, disabled, courseCode }: ExerciseProps) {
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

  return (
    <div className={styles.wrap}>
      <p className={styles.prompt}>{exercise.prompt}</p>
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
      <Button onClick={submit} disabled={disabled || chosen.length === 0}>
        Check
      </Button>
    </div>
  );
}
