import { useEffect, useState, type CSSProperties } from "react";
import styles from "./LessonResults.module.css";

const ANIMATION_MS = 900;

/**
 * End-of-lesson score breakdown: fraction, percentage, and a horizontal bar
 * that "crunches" out to the target percentage (a slight overshoot-then-
 * settle, via the `crunch` keyframes in the CSS module) with the percentage
 * counted up in sync and revealed once the fill lands.
 */
export function LessonResults({ correct, total }: { correct: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
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
        <span className={styles.number}>{displayed}%</span>
      </div>
    </div>
  );
}
