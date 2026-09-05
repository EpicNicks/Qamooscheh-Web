import { useEffect, useState } from "react";
import { Button } from "../common/Button";
import { DirectionalText } from "../common/DirectionalText";
import { ExercisePrompt } from "./ExercisePrompt";
import { RomanizedWord } from "./RomanizedText";
import { EMPTY_HINT_MAP, NO_HINTS } from "../../domain/romanization";
import { detectScriptDirection } from "../../domain/language";
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
  // Each tile is individually RTL-wrapped via DirectionalText, but that only
  // fixes glyph shaping within a tile — the flex rows below still lay their
  // *children* out left-to-right unless the row itself is told to flow RTL,
  // so a Persian answer would otherwise assemble backwards on screen even
  // though the submitted string (built from tap order, below) is correct.
  const isNativeScript = tiles.some((tile) => detectScriptDirection(tile) === "rtl");
  const direction = isNativeScript ? "rtl" : "ltr";
  // DirectionalText decides dir/font from courseCode alone, so a romanized
  // tile (Latin letters) would otherwise get Persian's RTL/font treatment
  // too — passing null for it here is the same as "not Persian" to that
  // component, leaving romanized tiles plain LTR text.
  const tileCourseCode = isNativeScript ? courseCode : null;

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
      <div className={styles.answerRow} dir={direction}>
        {chosen.map((tileIndex, position) => (
          <DirectionalText key={`${tileIndex}-${position}`} courseCode={tileCourseCode}>
            <button type="button" className={styles.tile} onClick={() => toggle(tileIndex)} disabled={disabled}>
              {/* focusable={false}: the tile's own <button> is already the tab
                  stop, and a focusable span inside it would be both invalid
                  HTML and a second stop per tile. */}
              <RomanizedWord word={tiles[tileIndex]} hint={hintMap.get(tiles[tileIndex])} settings={hintSettings} focusable={false} />
            </button>
          </DirectionalText>
        ))}
      </div>
      <div className={styles.tiles} dir={direction}>
        {tiles.map((tile, tileIndex) =>
          chosen.includes(tileIndex) ? null : (
            <DirectionalText key={tileIndex} courseCode={tileCourseCode}>
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
