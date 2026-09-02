import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Button } from "../common/Button";
import styles from "./TutorialOverlay.module.css";

export interface TutorialStep {
  /** The element to spotlight — null renders nothing for that step (e.g. before its ref has attached on first render). */
  targetEl: HTMLElement | null;
  title: string;
  description: string;
}

interface TutorialOverlayProps {
  /** Changes whenever the caller swaps in a different step list (e.g. moving from one mock exercise to the next) — resets the current step (and the outside-click count below) back to the start. */
  resetKey: string;
  steps: TutorialStep[];
  /** Fires once, either after "Got it" on the last step, or immediately on "Skip tutorial". */
  onFinish: () => void;
  /** Fires on the SECOND and every subsequent click outside the current step's spotlighted element (and outside this dialog) — repeatedly clicking away from what's highlighted reads as "I'm stuck", so the caller offers the real skip-tutorial confirmation instead of just letting the click do nothing. The first outside click is ignored outright. */
  onRepeatedOutsideClick: () => void;
}

/**
 * A spotlight walkthrough: a dark cutout hugs the current step's target
 * element (the box-shadow trick — one element with a huge shadow, no SVG
 * mask needed), with a small dialog beside it carrying the description and
 * Next/Skip. Deliberately non-blocking: nothing here disables the real
 * controls underneath, so a learner can act on what's highlighted instead of
 * only reading about it.
 *
 * "Skip tutorial" here only ends these callouts — unlike the interactive
 * tutorial's own skip (SkipTutorialModal), it never confirms, since
 * dismissing commentary costs the learner nothing they've already done.
 */
export function TutorialOverlay({ resetKey, steps, onFinish, onRepeatedOutsideClick }: TutorialOverlayProps) {
  const [index, setIndex] = useState(0);
  const [, setOutsideClicks] = useState(0);
  // Which resetKey `index`/`outsideClicks` were last seeded for — a plain
  // render-time re-seed (matching useVoiceAvailability.ts's own pattern)
  // rather than a useEffect just to reset values that are already derivable
  // during render.
  const [seededFor, setSeededFor] = useState(resetKey);
  if (resetKey !== seededFor) {
    setSeededFor(resetKey);
    setIndex(0);
    setOutsideClicks(0);
  }

  const [dialogEl, setDialogEl] = useState<HTMLElement | null>(null);
  const step = steps[index];
  const targetEl = step?.targetEl ?? null;

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (dialogEl?.contains(target)) return;
      if (targetEl?.contains(target)) return;
      setOutsideClicks((count) => {
        const next = count + 1;
        if (next >= 2) onRepeatedOutsideClick();
        return next;
      });
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [dialogEl, targetEl, onRepeatedOutsideClick]);

  if (!targetEl) return null;

  const rect = targetEl.getBoundingClientRect();
  const pad = 8;
  const spotlightStyle: CSSProperties = {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
  const dialogStyle: CSSProperties = {
    top: Math.min(rect.bottom + pad + 8, window.innerHeight - 160),
    left: Math.min(Math.max(8, rect.left), window.innerWidth - 296),
  };

  const isLast = index === steps.length - 1;

  return createPortal(
    <>
      <div className={styles.spotlight} style={spotlightStyle} />
      <div ref={setDialogEl} className={styles.dialog} style={dialogStyle} role="dialog" aria-label={step.title}>
        <h3 className={styles.title}>{step.title}</h3>
        <p className={styles.description}>{step.description}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.skip} onClick={onFinish}>
            Skip tutorial
          </button>
          <Button onClick={() => (isLast ? onFinish() : setIndex((i) => i + 1))}>{isLast ? "Got it" : "Next"}</Button>
        </div>
      </div>
    </>,
    document.body,
  );
}
