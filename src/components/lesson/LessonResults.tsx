import { useEffect, useRef, type CSSProperties } from "react";
import { useLocalAppPref } from "../../hooks/useLocalAppPref";
import { useCountUp } from "../../hooks/useCountUp";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { playSound } from "../../domain/sfx";
import styles from "./LessonResults.module.css";

const ANIMATION_MS = 900;

/**
 * End-of-lesson score breakdown: fraction, percentage, and a horizontal bar
 * that "crunches" out to the target percentage (a slight overshoot-then-
 * settle, via the `crunch` keyframes in the CSS module) with the percentage
 * counted up in sync and revealed once the fill lands. Under reduced motion
 * the bar and number are simply there (no overshoot, no count).
 *
 * `score` (0..1), when given, is the weighted score the pass mark is measured
 * on (a forgiven typo is half a point — domain/lessonScore.ts) and sets the
 * percentage in place of the plain fraction. `passMark` (0..1) draws a tick
 * on the bar where passing starts.
 */
export function LessonResults({
  correct,
  total,
  score,
  passMark,
  sound,
}: {
  correct: number;
  total: number;
  score?: number;
  passMark?: number;
  /** Played once as the results appear (domain/sfx.ts) — omit for none, e.g. a session the server didn't save. */
  sound?: "lessonPassed" | "lessonFailed" | "storyComplete";
}) {
  const [soundEffects] = useLocalAppPref("soundEffects", true);
  // Once, as the results come up — not again if the setting changes after,
  // nor on development StrictMode's second run of this effect.
  const played = useRef(false);
  useEffect(() => {
    if (played.current) return;
    played.current = true;
    if (sound && soundEffects) playSound(sound);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = Math.round((score ?? (total === 0 ? 0 : correct / total)) * 100);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const displayed = useCountUp(pct, ANIMATION_MS, reduced).value;

  return (
    <div className={styles.wrap}>
      <p className={styles.fraction}>
        {correct} / {total} correct
      </p>
      <div className={styles.track} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={styles.fill} style={{ "--pct": `${pct}%` } as CSSProperties} />
        {passMark !== undefined && (
          <div className={styles.passMark} style={{ left: `${passMark * 100}%` }} title={`Pass mark: ${Math.round(passMark * 100)}%`} />
        )}
        <span className={styles.number}>{displayed}%</span>
      </div>
    </div>
  );
}
