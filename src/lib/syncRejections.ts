// Sessions the server refused during a background flush (hooks/useOfflineQueueFlush.ts).
// Nobody is looking at the lesson that produced them any more, so they are kept
// per user until the learner dismisses the banner (components/layout/SyncRejectionBanner.tsx)
// and cleared at sign-out. A rejection returned to the lesson that is still open
// is shown on that lesson's own end screen and never lands here.
import { safeStorage } from "./safeStorage";

export const SYNC_REJECTIONS_CHANGED_EVENT = "qamooscheh:sync-rejections-changed";

export interface SyncRejection {
  submissionId: string;
  courseCode: string;
  unitKey: string | null;
  skillKey: string;
  occurredAt: string;
  /** The server's reason token, if it gave one. */
  reason: string | null;
}

function storageKey(userId: string): string {
  return `qamooscheh.syncRejections.${userId}`;
}

function notifyChanged(): void {
  window.dispatchEvent(new Event(SYNC_REJECTIONS_CHANGED_EVENT));
}

function normalizeEntry(entry: unknown): SyncRejection | null {
  if (!entry || typeof entry !== "object") return null;
  const candidate = entry as Partial<SyncRejection>;
  return typeof candidate.submissionId === "string" ? (candidate as SyncRejection) : null;
}

export function loadRejections(userId: string): SyncRejection[] {
  const raw = safeStorage.getItem(storageKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeEntry).filter((entry): entry is SyncRejection => entry !== null);
  } catch {
    return [];
  }
}

/** Appends `added`, skipping any whose submissionId is already kept. */
export function addRejections(userId: string, added: SyncRejection[]): void {
  if (added.length === 0) return;
  const existing = loadRejections(userId);
  const known = new Set(existing.map((r) => r.submissionId));
  const fresh = added.filter((r) => !known.has(r.submissionId));
  if (fresh.length === 0) return;
  safeStorage.setItem(storageKey(userId), JSON.stringify([...existing, ...fresh]));
  notifyChanged();
}

export function clearRejections(userId: string): void {
  safeStorage.removeItem(storageKey(userId));
  notifyChanged();
}
