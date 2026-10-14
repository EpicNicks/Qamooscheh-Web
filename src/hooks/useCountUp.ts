import { useEffect, useState } from "react";
import { countAt, easeOutCubic } from "../domain/lessonRecap";

/**
 * Counts from 0 up to `target` over `ms` on an ease-out cubic, and reports the
 * eased `progress` (0..1) it is at so a ring or bar can follow the same curve
 * as the number. Reduced motion lands on the target straight away. While
 * `active` is false it holds at 0 (for a figure that waits for its reveal).
 * Restarts if `target` changes.
 */
export function useCountUp(target: number, ms: number, reducedMotion: boolean, active: boolean = true) {
  const [elapsed, setElapsed] = useState<{ target: number; t: number }>({ target, t: 0 });

  useEffect(() => {
    if (reducedMotion || !active) return;
    const start = performance.now();
    let frame: number;
    function tick(now: number) {
      const t = Math.min(1, (now - start) / ms);
      setElapsed({ target, t });
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms, reducedMotion, active]);

  // A stale frame from a previous target counts as not started.
  const t = reducedMotion ? 1 : active && elapsed.target === target ? elapsed.t : 0;
  const progress = easeOutCubic(t);
  return { value: countAt(progress, target), progress, done: t >= 1 };
}
