// Animation hooks for the Stow art (Taiga #40). Nothing listens yet: the
// emitters fire at the moments the animation needs, and the art subscribes
// with `window.addEventListener(STOW_EVENT, ...)` and owns its own
// reduced-motion fallback.
export const STOW_EVENT = "qamooscheh:stow";

export type StowEventName =
  /** A stow landed (200 with `applied: true`). */
  | "stowCommitted"
  /** The reminder modal came up. */
  | "readyPromptShown"
  /** The learner started a stowed lesson again. */
  | "stowResumed"
  /** A pass cleared a stowed lesson (the submit result's `stowCleared`). */
  | "stowCleared";

export interface StowEventDetail {
  name: StowEventName;
  lessonKey?: string;
}

export function emitStowEvent(name: StowEventName, lessonKey?: string): void {
  window.dispatchEvent(new CustomEvent<StowEventDetail>(STOW_EVENT, { detail: { name, lessonKey } }));
}
