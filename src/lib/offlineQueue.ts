// A durable queue of SubmittedSession payloads that couldn't reach the
// server yet (API_SPEC.md §7/§8: the client is expected to queue answers
// offline and flush them, as an array, in one POST /v1/sessions/submit call
// once connectivity returns). Sessions already carry their own
// SubmissionId/OccurredAt/CourseVersion, which is what makes a delayed,
// batched flush safe to retry (§2.3 point 7's idempotency ledger).
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

export function loadQueue(userId: string): SubmittedSession[] {
  const raw = localStorage.getItem(storageKey(userId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SubmittedSession[];
  } catch {
    return [];
  }
}

export function enqueue(userId: string, session: SubmittedSession): void {
  const queue = loadQueue(userId);
  queue.push(session);
  localStorage.setItem(storageKey(userId), JSON.stringify(queue));
  notifyChanged();
}

/** Removes every queued session whose SubmissionId appears in `submissionIds` (i.e. was accepted by the server). */
export function removeFromQueue(userId: string, submissionIds: string[]): void {
  const remaining = loadQueue(userId).filter((s) => !submissionIds.includes(s.submissionId));
  localStorage.setItem(storageKey(userId), JSON.stringify(remaining));
  notifyChanged();
}
