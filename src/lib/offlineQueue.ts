// A durable queue of SubmittedSession payloads that couldn't reach the
// server yet (API_SPEC.md §7/§8: the client is expected to queue answers
// offline and flush them, as an array, in one POST /v1/sessions/submit call
// once connectivity returns). Sessions already carry their own
// SubmissionId/OccurredAt/CourseVersion/CourseCode, which is what makes a
// delayed, batched flush safe to retry (§2.3 point 7's idempotency ledger)
// regardless of which course is active when the flush actually runs — the
// server grades each session against the course it names.
import { safeStorage } from "./safeStorage";
import type { CardState, SubmittedSession, SubmitSessionsResponse } from "../types/api";
import type { SyncRejection } from "./syncRejections";

/**
 * Fired on every enqueue/dequeue, same-tab only (the native `storage` event
 * only fires in OTHER tabs) — hooks/useOfflineQueueFlush.ts listens for this
 * to react to a fresh queue item without polling localStorage.
 */
export const OFFLINE_QUEUE_CHANGED_EVENT = "qamooscheh:offline-queue-changed";

/** How long a claim by a live page protects its entries from the flush. */
export const CLAIM_TTL_MS = 2 * 60 * 1000;

/** Identifies this page load; a claim made by another page load (or a dead one) is not live. */
export const PAGE_ID: string = crypto.randomUUID();

/**
 * A queued session, optionally claimed by the page that is sending it right
 * now (write-ahead: saved before the request so a reload or tab close during
 * submit can't lose it). The claim fields never go on the wire.
 */
export type QueuedSession = SubmittedSession & { claimedBy?: string; claimedAt?: number };

function storageKey(userId: string): string {
  return `qamooscheh.offlineQueue.${userId}`;
}

function notifyChanged(): void {
  window.dispatchEvent(new Event(OFFLINE_QUEUE_CHANGED_EVENT));
}

/** Filters out anything that isn't at least session-shaped, e.g. corrupted or foreign JSON. */
function normalizeEntry(entry: unknown): QueuedSession | null {
  if (!entry || typeof entry !== "object") return null;
  const candidate = entry as Partial<QueuedSession>;
  return typeof candidate.submissionId === "string" ? (candidate as QueuedSession) : null;
}

export function loadQueue(userId: string): QueuedSession[] {
  const raw = safeStorage.getItem(storageKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeEntry).filter((entry): entry is QueuedSession => entry !== null);
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

/** Write-ahead: queue `session` claimed by this page before sending it. Replaces any entry with the same id. */
export function enqueueClaimed(userId: string, session: SubmittedSession, pageId: string = PAGE_ID): void {
  const queue = loadQueue(userId).filter((entry) => entry.submissionId !== session.submissionId);
  queue.push({ ...session, claimedBy: pageId, claimedAt: Date.now() });
  safeStorage.setItem(storageKey(userId), JSON.stringify(queue));
  notifyChanged();
}

/** Drops the claim on these ids so the flush may retry them (the send failed or went unanswered). */
export function releaseClaims(userId: string, submissionIds: string[]): void {
  const queue = loadQueue(userId).map((entry) => {
    if (!submissionIds.includes(entry.submissionId)) return entry;
    const { claimedBy: _by, claimedAt: _at, ...rest } = entry;
    return rest;
  });
  safeStorage.setItem(storageKey(userId), JSON.stringify(queue));
  notifyChanged();
}

/** True while `pageId` itself is mid-send on `entry`: claimed by it, and recently enough that the page can still be alive. */
export function isClaimLive(entry: QueuedSession, pageId: string, now: number): boolean {
  return entry.claimedBy === pageId && typeof entry.claimedAt === "number" && now - entry.claimedAt < CLAIM_TTL_MS;
}

/** Entries the flush may send: everything not live-claimed by this page. */
export function flushable(queue: QueuedSession[], pageId: string, now: number): QueuedSession[] {
  return queue.filter((entry) => !isClaimLive(entry, pageId, now));
}

/** True when `queue` holds a submission id that isn't in `knownIds` — i.e. something was enqueued since that snapshot and still needs a flush pass. */
export function hasUnknownSubmissions(queue: QueuedSession[], knownIds: Set<string>): boolean {
  return queue.some((session) => !knownIds.has(session.submissionId));
}

/** Removes every queued session whose SubmissionId appears in `submissionIds` (i.e. was settled by the server). */
export function removeFromQueue(userId: string, submissionIds: string[]): void {
  const remaining = loadQueue(userId).filter((session) => !submissionIds.includes(session.submissionId));
  safeStorage.setItem(storageKey(userId), JSON.stringify(remaining));
  notifyChanged();
}

export interface FlushSettlement {
  /** Every queued session the server answered for — done retrying, whatever the outcome. */
  settledIds: string[];
  /** The refused ones, to keep and show the learner. */
  rejections: SyncRejection[];
  /** Card states worth merging locally: never from a rejected session, which was not graded. */
  cards: CardState[][];
}

/** Sorts a flush response against the sessions it was sent for. Sessions the response doesn't mention stay queued. */
export function settleFlush(queued: SubmittedSession[], response: SubmitSessionsResponse): FlushSettlement {
  const byId = new Map(queued.map((session) => [session.submissionId, session]));
  const settledIds: string[] = [];
  const rejections: SyncRejection[] = [];
  const cards: CardState[][] = [];
  for (const result of response.sessions) {
    const session = byId.get(result.submissionId);
    if (!session) continue;
    settledIds.push(result.submissionId);
    if (result.outcome === "Rejected") {
      rejections.push({
        submissionId: session.submissionId,
        courseCode: session.courseCode,
        unitKey: session.unitKey ?? null,
        skillKey: session.skillKey,
        occurredAt: session.occurredAt,
        reason: result.rejectionReason,
      });
    } else if (result.cards.length > 0) {
      cards.push(result.cards);
    }
  }
  return { settledIds, rejections, cards };
}
