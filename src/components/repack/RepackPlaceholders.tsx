// CSS/transform placeholders for the Repack builder's animations, used by the
// registry in repackAnimations.ts until the real assets are provided.
import { useEffect } from "react";
import type { RepackAnimationProps } from "./repackAnimations";
import styles from "./RepackAnimations.module.css";

/** Calls onComplete after durationMs; the placeholders' stand-in for a real asset's end event. */
function useCompleteAfter(durationMs: number, onComplete: () => void) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, onComplete]);
}

/** A small Parsle chip falling into the box. Rendered over the box, so it is purely decorative. */
export function DropPlaceholder({ onComplete, durationMs }: RepackAnimationProps) {
  useCompleteAfter(durationMs, onComplete);
  return <span className={styles.dropChip} style={{ animationDuration: `${durationMs}ms` }} aria-hidden="true" />;
}

/** The box wobbles as the Parsle lands; the page shakes the box itself while this is mounted. */
export function ShakePlaceholder({ onComplete, durationMs }: RepackAnimationProps) {
  useCompleteAfter(durationMs, onComplete);
  return <span className={styles.marker} aria-hidden="true" />;
}

/** The box lid closing; the page styles the box as closed while this is mounted. */
export function BoxClosePlaceholder({ onComplete, durationMs }: RepackAnimationProps) {
  useCompleteAfter(durationMs, onComplete);
  return <span className={styles.marker} aria-hidden="true" />;
}

/** The screen fading to the app theme colour (the --color-bg token). */
export function FadeToThemePlaceholder({ onComplete, durationMs }: RepackAnimationProps) {
  useCompleteAfter(durationMs, onComplete);
  return <div className={styles.fade} style={{ animationDuration: `${durationMs}ms` }} aria-hidden="true" />;
}
