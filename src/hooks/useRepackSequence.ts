import { useCallback, useEffect, useRef, useState } from "react";
import { createAnimationPlayer, type PlayAnimation, type RepackAnimationName } from "../domain/repackSequence";
import { useMediaQuery } from "./useMediaQuery";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * Plays the builder's animations one at a time. `play(name)` resolves when the
 * animation mounted for `active` calls `complete()`; calls made meanwhile queue
 * behind it. Under prefers-reduced-motion nothing is mounted and every `play`
 * resolves at once, so each step lands directly in its end state.
 */
export function useRepackSequence() {
  const reduced = useMediaQuery(REDUCED_MOTION);
  const reducedRef = useRef(reduced);
  // `id` keys the mounted animation so two in a row of the same name still remount.
  const [active, setActive] = useState<{ name: RepackAnimationName; id: number } | null>(null);
  const nextId = useRef(0);
  const resolveRef = useRef<(() => void) | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);
  const playerRef = useRef<PlayAnimation | null>(null);
  useEffect(() => {
    mounted.current = true;
    playerRef.current = createAnimationPlayer(
      (name) =>
        new Promise<void>((resolve) => {
          if (!mounted.current) return resolve();
          resolveRef.current = resolve;
          setActive({ name, id: nextId.current++ });
        }),
      () => reducedRef.current,
    );
    return () => {
      mounted.current = false;
      resolveRef.current?.();
    };
  }, []);

  const play = useCallback<PlayAnimation>((name) => playerRef.current?.(name) ?? Promise.resolve(), []);

  const complete = useCallback(() => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setActive(null);
    resolve?.();
  }, []);

  return { active, play, complete, reducedMotion: reduced };
}
