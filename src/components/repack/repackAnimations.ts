// The Repack builder's animation registry. The final art is not ready: each
// entry is a CSS/transform placeholder (RepackPlaceholders.tsx). To swap in a
// real asset (Lottie, sprite, video), replace that entry's `Component` --
// nothing else changes.
//
// Contract for a Component: render the animation, and call `onComplete`
// exactly once when it has finished playing. `durationMs` is the intended
// length; the placeholders use it for their timer, and a real asset should
// match it (or just call onComplete from its own end event, in which case
// `durationMs` is only documentation). The sequencing (useRepackSequence)
// never reads durations itself: it waits for onComplete. Under
// prefers-reduced-motion the Component is not mounted at all.
import type { ComponentType } from "react";
import type { RepackAnimationName } from "../../domain/repackSequence";
import { BoxClosePlaceholder, DropPlaceholder, FadeToThemePlaceholder, ShakePlaceholder } from "./RepackPlaceholders";

export type { RepackAnimationName };

export interface RepackAnimationProps {
  /** Call once when the animation has finished. */
  onComplete: () => void;
  /** The entry's `durationMs`, passed through for placeholders that time themselves. */
  durationMs: number;
}

export interface RepackAnimationEntry {
  /** Intended length in milliseconds. */
  durationMs: number;
  Component: ComponentType<RepackAnimationProps>;
}

export const REPACK_ANIMATIONS: Record<RepackAnimationName, RepackAnimationEntry> = {
  drop: { durationMs: 500, Component: DropPlaceholder },
  shake: { durationMs: 400, Component: ShakePlaceholder },
  boxClose: { durationMs: 600, Component: BoxClosePlaceholder },
  fadeToTheme: { durationMs: 500, Component: FadeToThemePlaceholder },
};
