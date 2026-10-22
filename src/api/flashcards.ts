// v1/flashcards — FlashcardsController.cs. A round is submitted once, when
// it ends; see types/api.ts's v1/flashcards header for what earns XP.
import { ApiError, apiFetch } from "./httpClient";
import { clearFlashcardAttempt, saveFlashcardAttempt } from "../lib/flashcardAttempt";
import type { SubmitFlashcardsRequest, SubmitFlashcardsResponse } from "../types/api";

interface SubmitOptions {
  keepalive?: boolean;
  /** The account the round belongs to; the request fails rather than go out under another's token. */
  asUserId?: string;
}

export function submitFlashcards(request: SubmitFlashcardsRequest, options?: SubmitOptions): Promise<SubmitFlashcardsResponse> {
  return apiFetch<SubmitFlashcardsResponse>("/v1/flashcards/submit", {
    method: "POST",
    body: request,
    keepalive: options?.keepalive,
    asUserId: options?.asUserId,
  });
}

const inFlight = new Set<string>();

/** True while this page is mid-send on the round, so a replay leaves it to its own request. */
export function isFlashcardSubmitInFlight(submissionId: string): boolean {
  return inFlight.has(submissionId);
}

/**
 * Submits a round that survives a reload: the request is saved first
 * (lib/flashcardAttempt.ts) and dropped once the server has answered, whatever
 * the status, so a response lost in flight is re-sent by useFlashcardReplay
 * with the same submissionId and occurredAt. A network failure (or a sign-out
 * mid-flight) leaves it saved and rethrows.
 */
export async function submitFlashcardsDurably(
  userId: string,
  request: SubmitFlashcardsRequest,
  options?: { keepalive?: boolean },
): Promise<SubmitFlashcardsResponse> {
  saveFlashcardAttempt(userId, request);
  inFlight.add(request.submissionId);
  try {
    const response = await submitFlashcards(request, { ...options, asUserId: userId });
    clearFlashcardAttempt(userId, request.submissionId);
    return response;
  } catch (error) {
    if (error instanceof ApiError) clearFlashcardAttempt(userId, request.submissionId);
    throw error;
  } finally {
    inFlight.delete(request.submissionId);
  }
}
