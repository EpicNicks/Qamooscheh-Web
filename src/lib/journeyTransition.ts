// The one-shot Journey completion animation's hand-off, in memory only (lost on
// reload, which is the point: a reload or revisit never replays it).
//
// finishLesson records a graded pass here; PathPage compares the path it last
// showed with the one it shows once the refetch lands (domain/pathProgress.ts's
// diffPathProgress), plays the result once and drops the record.
import type { PathUnit } from "../domain/pathProgress";

/** A pass recorded longer ago than this was never going to be followed by a return to the Journey. */
const PENDING_TTL_MS = 60_000;

let pending: { skillKeys: string[]; at: number } | null = null;
let lastPath: PathUnit[] | null = null;

/** Called for a graded, non-practice, non-Repack pass the server accepted. */
export function recordGradedCompletion(skillKeys: string[]) {
  if (skillKeys.length > 0) pending = { skillKeys, at: Date.now() };
}

export function takePendingCompletion(): string[] | null {
  return pending && Date.now() - pending.at < PENDING_TTL_MS ? pending.skillKeys : null;
}

export function clearPendingCompletion() {
  pending = null;
}

export function lastShownPath(): PathUnit[] | null {
  return lastPath;
}

export function rememberShownPath(path: PathUnit[]) {
  lastPath = path;
}
