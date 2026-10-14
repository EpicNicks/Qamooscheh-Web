import type { PathPosition } from "./pathProgress";

export type ForkLineKind = "locked" | "unlocked" | "open";

/**
 * A collapsed fork's per-lesson line: done keeps the walked-road colour; a
 * lesson still to do is blue running into the fork and grey running out of it
 * towards the next lesson; a locked fork is all grey.
 */
export function forkLineKind(status: PathPosition["status"], completed: boolean, leaving: boolean): ForkLineKind {
  if (status === "locked") return "locked";
  if (completed) return "unlocked";
  return leaving ? "locked" : "open";
}
