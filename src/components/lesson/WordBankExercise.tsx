import { useEffect, useState } from "react";
import { Button } from "../common/Button";
import { DirectionalText } from "../common/DirectionalText";
import { ExercisePrompt } from "./ExercisePrompt";
import { RomanizedWord } from "./RomanizedText";
import { EMPTY_HINT_MAP, NO_HINTS } from "../../domain/romanization";
import type { ExerciseProps } from "./ExerciseRenderer";
import styles from "./Exercise.module.css";

/** Tap tiles in order to build the answer; tapping a chosen tile again removes it. */
export function WordBankExercise({
  exercise,
  onSubmit,
  disabled,
  courseCode,
  autoplayAudio,
  hintMap = EMPTY_HINT_MAP,
  hintSettings = NO_HINTS,
  advance,
}: ExerciseProps) {
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
      <ExercisePrompt text={exercise.prompt} courseCode={courseCode} autoplayAudio={autoplayAudio} hintMap={hintMap} hintSettings={hintSettings} />
      <div className={styles.answerRow}>
        {chosen.map((tileIndex, position) => (
          <DirectionalText key={`${tileIndex}-${position}`} courseCode={courseCode}>
            <button type="button" className={styles.tile} onClick={() => toggle(tileIndex)} disabled={disabled}>
              {/* focusable={false}: the tile's own <button> is already the tab
                  stop, and a focusable span inside it would be both invalid
                  HTML and a second stop per tile. */}
              <RomanizedWord word={tiles[tileIndex]} hint={hintMap.get(tiles[tileIndex])} settings={hintSettings} focusable={false} />
            </button>
          </DirectionalText>
        ))}
      </div>
      <div className={styles.tiles}>
        {tiles.map((tile, tileIndex) =>
          chosen.includes(tileIndex) ? null : (
            <DirectionalText key={tileIndex} courseCode={courseCode}>
              <button type="button" className={styles.tile} onClick={() => toggle(tileIndex)} disabled={disabled}>
                <RomanizedWord word={tile} hint={hintMap.get(tile)} settings={hintSettings} focusable={false} />
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
