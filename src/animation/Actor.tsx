import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { chooseBackend, clampSpeed, settleDelayMs, type ActorDefinition, type ActorProps } from "./actor";
import type { RiveBackendProps } from "./RiveBackend";
import styles from "./Actor.module.css";

/** Stands in for the Rive chunk when it can't load: reports failure so the actor stays on its Fallback. */
function ChunkFailed({ onFail }: RiveBackendProps<string>) {
  useEffect(onFail, [onFail]);
  return null;
}

// Lazy so the Rive runtime is its own chunk, and failure-tolerant (ChunkFailed).
const RiveBackend = lazy(() => import("./RiveBackend").catch(() => ({ default: ChunkFailed })));

const NO_SLOTS: Readonly<Record<string, string>> = {};

/**
 * Draws one animated thing from its definition. The Fallback stays mounted
 * until Rive has a frame to show, so there is no blank flash and no layout
 * shift, and it is what remains if Rive never arrives.
 */
export function Actor<S extends string>({
  definition,
  state,
  speed: rawSpeed,
  slots = NO_SLOTS,
  onSettled,
  className,
  label,
}: ActorProps<S> & { definition: ActorDefinition<S> }) {
  const speed = clampSpeed(rawSpeed);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [riveFailed, setRiveFailed] = useState(false);
  const [riveReady, setRiveReady] = useState(false);
  const backend = chooseBackend({ hasRive: definition.rive != null, reducedMotion, riveFailed });
  const showFallback = backend === "fallback" || !riveReady;

  // Latest callback without re-arming the timer every render.
  const settledRef = useRef(onSettled);
  useEffect(() => {
    settledRef.current = onSettled;
  });
  const fireSettled = useCallback(() => settledRef.current?.(state), [state]);

  // The fallback settles by timer; Rive by its own `settled` event. Under
  // reduced motion nothing plays, so a one-shot settles at once rather than
  // leaving a sequence waiting on movement that will never happen.
  useEffect(() => {
    if (!showFallback) return;
    const delay = settleDelayMs(definition.states[state], speed);
    if (delay == null) return;
    const timer = window.setTimeout(fireSettled, reducedMotion ? 0 : delay);
    return () => window.clearTimeout(timer);
  }, [showFallback, definition, state, speed, reducedMotion, fireSettled]);

  const onRiveFail = useCallback(() => setRiveFailed(true), []);
  const onRiveReady = useCallback(() => setRiveReady(true), []);
  const Fallback = definition.Fallback;

  return (
    <span
      className={[styles.actor, className].filter(Boolean).join(" ")}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-actor={definition.id}
      data-backend={showFallback ? "fallback" : "rive"}
    >
      {showFallback && <Fallback state={state} speed={speed} slots={slots} still={reducedMotion} />}
      {backend === "rive" && definition.rive && (
        <Suspense fallback={null}>
          <span className={showFallback ? styles.pending : styles.riveLayer}>
            <RiveBackend
              binding={definition.rive}
              state={state}
              speed={speed}
              slots={slots}
              className={styles.canvas}
              onReady={onRiveReady}
              onFail={onRiveFail}
              onSettled={fireSettled}
            />
          </span>
        </Suspense>
      )}
    </span>
  );
}
