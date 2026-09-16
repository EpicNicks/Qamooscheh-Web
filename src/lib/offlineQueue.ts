// A durable queue of SubmittedSession payloads that couldn't reach the
// server yet (API_SPEC.md §7/§8: the client is expected to queue answers
// offline and flush them, as an array, in one POST /v1/sessions/submit call
// once connectivity returns). Sessions already carry their own
// SubmissionId/OccurredAt/CourseVersion/CourseCode, which is what makes a
// delayed, batched flush safe to retry (§2.3 point 7's idempotency ledger)
// regardless of which course is active when the flush actually runs — the
// server grades each session against the course it names.
import { safeStorage } from "./safeStorage";
import type { SubmittedSession } from "../types/api";

/**
 * Fired on every enqueue/dequeue, same-tab only (the native `storage` event
 * only fires in OTHER tabs) — hooks/useOfflineQueueFlush.ts listens for this
 * to react to a fresh queue item without polling localStorage.
 */
export const OFFLINE_QUEUE_CHANGED_EVENT = "qamooscheh:offline-queue-changed";

function storageKey(userId: string): string {
  return `qamooscheh.offlineQueue.${userId}`;
}

function notifyChanged(): void {
  window.dispatchEvent(new Event(OFFLINE_QUEUE_CHANGED_EVENT));
}

/** Filters out anything that isn't at least session-shaped, e.g. corrupted or foreign JSON. */
function normalizeEntry(entry: unknown): SubmittedSession | null {
  if (!entry || typeof entry !== "object") return null;
  const candidate = entry as Partial<SubmittedSession>;
  return typeof candidate.submissionId === "string" ? (candidate as SubmittedSession) : null;
}

export function loadQueue(userId: string): SubmittedSession[] {
  const raw = safeStorage.getItem(storageKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeEntry).filter((entry): entry is SubmittedSession => entry !== null);
  } catch {
    return [];
  }
}

export function enqueue(userId: string, session: SubmittedSession): void {
  const queue = loadQueue(userId);
  queue.push(session);
  safeStorage.setItem(storageKey(userId), JSON.stringify(queue));
  notifyChanged();
}

/** True when `queue` holds a submission id that isn't in `knownIds` — i.e. something was enqueued since that snapshot and still needs a flush pass. */
export function hasUnknownSubmissions(queue: SubmittedSession[], knownIds: Set<string>): boolean {
  return queue.some((session) => !knownIds.has(session.submissionId));
}

/** Removes every queued session whose SubmissionId appears in `submissionIds` (i.e. was settled by the server). */
export function removeFromQueue(userId: string, submissionIds: string[]): void {
  const remaining = loadQueue(userId).filter((session) => !submissionIds.includes(session.submissionId));
  safeStorage.setItem(storageKey(userId), JSON.stringify(remaining));
  notifyChanged();
}
