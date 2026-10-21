// The checkpoint request (API_SPEC.md §2.7) that's been sent, or is about to
// be, for a target — kept across a reload or tab close so a response lost in
// flight can be replayed with the same submissionId/occurredAt (the server
// replays an id it has seen rather than grading a second attempt), and so the
// learner doesn't redo a finished test. Saved before the request goes out,
// cleared once the server has answered (any HTTP status), kept on a network
// failure. One attempt per user per target; saving again overwrites.
import { safeStorage } from "./safeStorage";
import type { SubmitCheckpointRequest } from "../types/api";

function storageKey(userId: string): string {
  return `qamooscheh.checkpointAttempts.${userId}`;
}

function targetKey(targetUnitKey: string, targetSkillKey: string): string {
  return `${targetUnitKey}/${targetSkillKey}`;
}

function isAttempt(entry: unknown): entry is SubmitCheckpointRequest {
  if (!entry || typeof entry !== "object") return false;
  const candidate = entry as Partial<SubmitCheckpointRequest>;
  return (
    typeof candidate.submissionId === "string" &&
    typeof candidate.occurredAt === "string" &&
    typeof candidate.courseVersion === "number" &&
    typeof candidate.targetUnitKey === "string" &&
    typeof candidate.targetSkillKey === "string" &&
    Array.isArray(candidate.skills)
  );
}

function loadAll(userId: string): Record<string, SubmitCheckpointRequest> {
  const raw = safeStorage.getItem(storageKey(userId));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, entry]) => isAttempt(entry)));
  } catch {
    return {};
  }
}

function writeAll(userId: string, attempts: Record<string, SubmitCheckpointRequest>): void {
  if (Object.keys(attempts).length === 0) safeStorage.removeItem(storageKey(userId));
  else safeStorage.setItem(storageKey(userId), JSON.stringify(attempts));
}

export function loadCheckpointAttempt(
  userId: string,
  targetUnitKey: string,
  targetSkillKey: string,
): SubmitCheckpointRequest | null {
  return loadAll(userId)[targetKey(targetUnitKey, targetSkillKey)] ?? null;
}

export function saveCheckpointAttempt(userId: string, request: SubmitCheckpointRequest): void {
  const attempts = loadAll(userId);
  attempts[targetKey(request.targetUnitKey, request.targetSkillKey)] = request;
  writeAll(userId, attempts);
}

export function clearCheckpointAttempt(userId: string, targetUnitKey: string, targetSkillKey: string): void {
  const attempts = loadAll(userId);
  delete attempts[targetKey(targetUnitKey, targetSkillKey)];
  writeAll(userId, attempts);
}

/** Drops every pending attempt for a user, e.g. at sign-out. */
export function clearCheckpointAttempts(userId: string): void {
  safeStorage.removeItem(storageKey(userId));
}
