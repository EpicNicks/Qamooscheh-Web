// The flashcard requests (API_SPEC.md v1/flashcards) that have been sent, or
// are about to be — kept across a reload or tab close so a response lost in
// flight can be replayed with the same submissionId/occurredAt (the server
// answers an id it has seen with the first award instead of paying twice).
// Saved before the request goes out, cleared once the server has answered (any
// HTTP status), kept on a network failure. A persisted attempt rather than a
// queue, as for checkpoints: a round is one request that either reached the
// server or didn't, with nothing to batch or order. Keyed by submissionId, per
// user, since a round can end before the last one's answer arrives.
import { safeStorage } from "./safeStorage";
import type { SubmitFlashcardsRequest } from "../types/api";

function storageKey(userId: string): string {
  return `qamooscheh.flashcardAttempts.${userId}`;
}

export function isFlashcardAttempt(entry: unknown): entry is SubmitFlashcardsRequest {
  if (!entry || typeof entry !== "object") return false;
  const candidate = entry as Partial<SubmitFlashcardsRequest>;
  return (
    typeof candidate.submissionId === "string" &&
    typeof candidate.courseCode === "string" &&
    typeof candidate.occurredAt === "string" &&
    typeof candidate.inRemix === "boolean" &&
    Array.isArray(candidate.cards)
  );
}

function loadAll(userId: string): Record<string, SubmitFlashcardsRequest> {
  const raw = safeStorage.getItem(storageKey(userId));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, entry]) => isFlashcardAttempt(entry)));
  } catch {
    return {};
  }
}

function writeAll(userId: string, attempts: Record<string, SubmitFlashcardsRequest>): void {
  if (Object.keys(attempts).length === 0) safeStorage.removeItem(storageKey(userId));
  else safeStorage.setItem(storageKey(userId), JSON.stringify(attempts));
}

/** Every unanswered attempt for a user, oldest first. */
export function loadFlashcardAttempts(userId: string): SubmitFlashcardsRequest[] {
  return Object.values(loadAll(userId)).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

export function saveFlashcardAttempt(userId: string, request: SubmitFlashcardsRequest): void {
  const attempts = loadAll(userId);
  attempts[request.submissionId] = request;
  writeAll(userId, attempts);
}

export function clearFlashcardAttempt(userId: string, submissionId: string): void {
  const attempts = loadAll(userId);
  delete attempts[submissionId];
  writeAll(userId, attempts);
}

/** Drops every pending attempt for a user, e.g. at sign-out. */
export function clearFlashcardAttempts(userId: string): void {
  safeStorage.removeItem(storageKey(userId));
}
