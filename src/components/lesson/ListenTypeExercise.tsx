import { useRecordings } from "../../hooks/useRecordings";
import { MAX_PLAYS, useListenPlays } from "../../hooks/useListenPlays";
import { displayDirection } from "../../domain/annotation";
import { PlayAudioButton } from "./PlayAudioButton";
import { TypeInExercise } from "./TypeInExercise";
import type { ExerciseProps } from "./ExerciseRenderer";
import styles from "./Exercise.module.css";

/**
 * Listening test (`listen_type`, API_SPEC.md §2.3 point 8): the learner hears
 * the prompt's recording, its text stays hidden until they have answered, and
 * they type what they heard. It is a type-in exercise in every other respect —
 * same field, keyboards and grader — so it wraps TypeInExercise with the
 * audio-only prompt in place of the written one.
 *
 * Three plays, each after the first paying less (the server prices the answer
 * at attempt max(attempt, playsUsed)). There are no hints, no retype, and no
 * synthetic-voice fallback: without a recording there is nothing to hear, so
 * the text is shown instead of leaving the learner stuck. Nothing autoplays,
 * since a play the learner didn't ask for would still cost XP.
 */
export function ListenTypeExercise(props: ExerciseProps) {
  const { exercise, textSettings, reviewedAnswer } = props;
  const audioUrl = useRecordings().phraseUrl(exercise.promptAudio, exercise.speaker);
  const answered = !!reviewedAnswer;
  const plays = useListenPlays(audioUrl, answered);
  const unplayable = audioUrl === null;
  const direction = displayDirection(exercise.prompt, textSettings?.display ?? "native");

  const promptSlot = (
    <div className={styles.promptRow}>
      {answered || unplayable ? (
        <p className={styles.prompt} dir={direction}>
          {exercise.prompt}
        </p>
      ) : (
        <p className={styles.prompt}>Type what you hear.</p>
      )}
      {!unplayable && (
        <PlayAudioButton
          status={plays.status}
          onClick={plays.play}
          onSlowClick={plays.playSlow}
          disabled={!plays.canPlay}
        />
      )}
      {!unplayable && !answered && (
        <span className={styles.note} role="status">
          {plays.completed >= MAX_PLAYS ? "No plays left" : `Plays heard: ${plays.completed} of ${MAX_PLAYS}. Each play after the first lowers the XP.`}
        </span>
      )}
    </div>
  );

  return <TypeInExercise {...props} autoplayAudio={false} promptSlot={promptSlot} listenPlays={plays.playsUsed} retype={undefined} />;
}
