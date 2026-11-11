// Reader completions that haven't reached the server yet. A story is often
// listened to on a train, so a finish that can't be sent is kept per user and
// retried the next time the app can. Each is idempotent server-side, so
// sending one twice does no harm. Separate from lib/offlineQueue.ts, which is
// graded sessions only.
import { safeStorage } from "./safeStorage";
import { ApiError } from "../api/httpClient";
import { completeReading, type CompleteReadingRequest } from "../api/readerCompletion";

function storageKey(userId: string): string {
  return `qamooscheh.readerCompletions.${userId}`;
}

export function loadPendingCompletions(userId: string): CompleteReadingRequest[] {
  const raw = safeStorage.getItem(storageKey(userId));
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CompleteReadingRequest[]) : [];
  } catch {
    return [];
  }
}

function save(userId: string, pending: CompleteReadingRequest[]): void {
  safeStorage.setItem(storageKey(userId), JSON.stringify(pending));
}

const sameSkill = (a: CompleteReadingRequest, b: CompleteReadingRequest) =>
  a.courseCode === b.courseCode && a.unitKey === b.unitKey && a.skillKey === b.skillKey;

/**
 * Whether a failure is one the server will always give for this request: the
 * request is dropped rather than retried. Only a network failure or a 5xx is
 * worth another try (the server's own guidance for this call).
 */
export function isDefinitiveFailure(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500;
}

/** Sends one completion now, keeping it for a later retry when it can't get through. Resolves true once the server has it. */
export async function sendCompletion(userId: string, request: CompleteReadingRequest): Promise<boolean> {
  const rest = loadPendingCompletions(userId).filter((entry) => !sameSkill(entry, request));
  save(userId, [...rest, request]);
  try {
    await completeReading(request);
  } catch (error) {
    // Definitive: drop it. Otherwise it stays queued.
    if (isDefinitiveFailure(error)) save(userId, rest);
    return false;
  }
  save(userId, rest);
  return true;
}

/** Retries everything still waiting. Resolves whether any got through, so the caller can refresh what it shows. */
export async function flushCompletions(userId: string): Promise<boolean> {
  let anySent = false;
  for (const request of loadPendingCompletions(userId)) {
    if (await sendCompletion(userId, request)) anySent = true;
  }
  return anySent;
}
