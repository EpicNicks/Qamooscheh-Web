// The order of the Repack builder's animations, kept apart from React so the
// sequencing can be tested with a fake `play`. `play` resolves when that
// animation has finished (or at once under reduced motion).

/** The animations the builder plays; components/repack/repackAnimations.ts maps each to what renders. */
export type RepackAnimationName = "drop" | "shake" | "boxClose" | "fadeToTheme";

export type PlayAnimation = (name: RepackAnimationName) => Promise<void>;

/** A Parsle chosen: it drops into the box, then the box shakes as it lands. */
export async function runDropSequence(play: PlayAnimation): Promise<void> {
  await play("drop");
  await play("shake");
}

/** GO!: the box closes, the screen fades to the theme colour, then the Repack starts. */
export async function runGoSequence(play: PlayAnimation, start: () => void): Promise<void> {
  await play("boxClose");
  await play("fadeToTheme");
  start();
}

/**
 * Serialises animations: each `play` starts only after the previous one has
 * finished. `mount(name)` shows the animation and resolves when it completes.
 * When `isReduced()` is true nothing is mounted and `play` resolves at once, so
 * the step lands directly in its end state (prefers-reduced-motion).
 */
export function createAnimationPlayer(
  mount: (name: RepackAnimationName) => Promise<void>,
  isReduced: () => boolean,
): PlayAnimation {
  let tail: Promise<void> = Promise.resolve();
  return (name) => {
    if (isReduced()) return Promise.resolve();
    const run = tail.then(() => mount(name));
    tail = run;
    return run;
  };
}
