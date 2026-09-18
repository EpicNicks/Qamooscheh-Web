import { useEffect, useMemo, useState } from "react";
import { Button } from "../common/Button";
import { DirectionalText } from "../common/DirectionalText";
import { ExercisePrompt } from "./ExercisePrompt";
import { AnnotatedText } from "./AnnotatedText";
import { EMPTY_HINT_MAP, PLAIN_TEXT } from "../../domain/romanization";
import { detectScriptDirection } from "../../domain/language";
import type { ExerciseProps } from "./ExerciseRenderer";
import styles from "./Exercise.module.css";

function shuffleIndices(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Tap tiles in order to build the answer; tapping a chosen tile again removes it. */
export function WordBankExercise({
  exercise,
  onSubmit,
  disabled,
  courseCode,
  autoplayAudio,
  hintMap = EMPTY_HINT_MAP,
  textSettings = PLAIN_TEXT,
  advance,
}: ExerciseProps) {
  const [chosen, setChosen] = useState<number[]>([]);
  const tiles = exercise.tiles ?? [];
  // Shuffled once per exercise (keyed on the exercise object itself, which a
  // new question gets a fresh reference for) so the bank's on-screen order
  // never leaks the answer via tile position — re-shuffling on every render
  // would instead reorder tiles out from under an in-progress tap sequence.
  const tileOrder = useMemo(() => shuffleIndices(tiles.length), [exercise]);
  // Each tile is individually RTL-wrapped via DirectionalText, but that only
  // fixes glyph shaping within a tile — the answer row's own layout is
  // handled separately (see .answerRowRtl below) so a Persian answer reads
  // right-to-left (first-tapped tile rightmost, each new tile added to its
  // left) even though the submitted string (built from tap order) is a
  // plain left-to-right array. In "romanized" display every tile's BASE text
  // is Latin regardless of its source script, so there is no RTL layout to
  // apply at all.
  const isNativeScript = textSettings.display !== "romanized" && tiles.some((tile) => detectScriptDirection(tile) === "rtl");
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
      <ExercisePrompt text={exercise.prompt} courseCode={courseCode} autoplayAudio={autoplayAudio} hintMap={hintMap} textSettings={textSettings} />
      <div className={isNativeScript ? `${styles.answerRow} ${styles.answerRowRtl}` : styles.answerRow} dir="ltr">
        {chosen.map((tileIndex, position) => (
          <DirectionalText key={`${tileIndex}-${position}`} courseCode={tileCourseCode}>
            <button type="button" className={styles.tile} onClick={() => toggle(tileIndex)} disabled={disabled}>
              {/* focusable={false}: the tile's own <button> is already the tab
                  stop, and a focusable span inside it would be both invalid
                  HTML and a second stop per tile. */}
              <AnnotatedText text={tiles[tileIndex]} hintMap={hintMap} settings={textSettings} focusable={false} />
            </button>
          </DirectionalText>
        ))}
      </div>
      {/* Unlike .answerRow above, the unpicked bank deliberately stays LTR
          regardless of language — these boxes are read by position while
          scanning for the next tile to tap, not in sentence order, so
          pinning them to a consistent left-to-right layout (the same
          "reduce eye travel" reasoning as StoryTranscript's left-aligned
          lines) matters more here than mirroring the language's direction.
          Only a tile's own text (via DirectionalText) still shapes/reads
          right-to-left for Persian. */}
      <div className={styles.tiles} dir="ltr">
        {tileOrder.map((tileIndex) =>
          chosen.includes(tileIndex) ? null : (
            <DirectionalText key={tileIndex} courseCode={tileCourseCode}>
              <button type="button" className={styles.tile} onClick={() => toggle(tileIndex)} disabled={disabled}>
                <AnnotatedText text={tiles[tileIndex]} hintMap={hintMap} settings={textSettings} focusable={false} />
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
