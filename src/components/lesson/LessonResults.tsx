import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useLocalAppPref } from "../../hooks/useLocalAppPref";
import { playSound } from "../../domain/sfx";
import styles from "./LessonResults.module.css";

const ANIMATION_MS = 900;

/**
 * End-of-lesson score breakdown: fraction, percentage, and a horizontal bar
 * that "crunches" out to the target percentage (a slight overshoot-then-
 * settle, via the `crunch` keyframes in the CSS module) with the percentage
 * counted up in sync and revealed once the fill lands.
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
  sound?: "lessonPassed" | "lessonFailed";
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
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let frame: number;
    function tick(now: number) {
      const t = Math.min(1, (now - start) / ANIMATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(eased * pct));
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [pct]);

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
