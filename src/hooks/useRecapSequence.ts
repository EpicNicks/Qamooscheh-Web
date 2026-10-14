import { useEffect, useState } from "react";
import { initialRecapPhase, nextRecapPhase, RECAP_BURST_MS, RECAP_FILL_MS, type RecapPhase } from "../domain/lessonRecap";
import { useCountUp } from "./useCountUp";
import { useMediaQuery } from "./useMediaQuery";

/**
 * Drives the lesson recap: the ring fills (an eased count-up from 0 to
 * `targetPct`), then a celebrated lesson bursts, then the text is revealed.
 * The ring and the number both follow `progress`, so they can't drift apart.
 * Reduced motion starts in the final state.
 *
 * Phases only move forward (domain/lessonRecap.ts), and each runs once per
 * mount, so a re-render never replays the sequence.
 */
export function useRecapSequence(targetPct: number, celebrate: boolean) {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const fill = useCountUp(targetPct, RECAP_FILL_MS, reduced);
  const [burstDone, setBurstDone] = useState(false);

  // The fill landed: hold the burst, then move on to the reveal.
  const afterFill = fill.done ? nextRecapPhase("fill", celebrate) : "fill";
  useEffect(() => {
    if (afterFill !== "burst") return;
    const timer = setTimeout(() => setBurstDone(true), RECAP_BURST_MS);
    return () => clearTimeout(timer);
  }, [afterFill]);

  const phase: RecapPhase = reduced ? initialRecapPhase(true) : burstDone ? nextRecapPhase("burst", celebrate) : afterFill;
  return { phase, progress: fill.progress, value: fill.value, reduced };
}
