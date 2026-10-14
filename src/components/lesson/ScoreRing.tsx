import type { CSSProperties } from "react";
import styles from "./ScoreRing.module.css";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The recap's score ring. `progress` (0..1) is how far the fill has got along
 * the animation (hooks/useRecapSequence), `pct` the score it is filling
 * towards and `shown` the number counted up with it. `passMark` (0..1) draws a
 * tick where passing starts. The fill is driven from JS rather than CSS so it
 * and the number share one curve.
 */
export function ScoreRing({
  pct,
  progress,
  shown,
  passMark,
  tone,
}: {
  pct: number;
  progress: number;
  shown: number;
  passMark?: number;
  tone: "success" | "warning";
}) {
  const fraction = Math.min(1, Math.max(0, (pct / 100) * progress));
  return (
    <div
      className={`${styles.ring} ${tone === "warning" ? styles.warning : styles.success}`}
      role="progressbar"
      aria-label="Score"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg viewBox="0 0 120 120" className={styles.svg} aria-hidden="true">
        <circle className={styles.track} cx="60" cy="60" r={RADIUS} />
        <circle
          className={styles.progress}
          cx="60"
          cy="60"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
        />
      </svg>
      {passMark !== undefined && (
        <div
          className={styles.tick}
          style={{ "--pass": passMark } as CSSProperties}
          title={`Pass mark: ${Math.round(passMark * 100)}%`}
          aria-hidden="true"
        />
      )}
      <span className={styles.pct}>{shown}%</span>
    </div>
  );
}
