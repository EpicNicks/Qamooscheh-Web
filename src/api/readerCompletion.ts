// v1/skills/complete-reading — records a story/conversation/song version as
// read, ungraded: no answers, no cards, no XP, no streak day. Idempotent, so a
// replay after a dropped connection is harmless (API_SPEC.md §2.3a, backend
// feature `reader-completion`).
import { apiFetch } from "./httpClient";

export interface CompleteReadingRequest {
  courseCode: string;
  unitKey: string;
  skillKey: string;
  /** ISO time the learner finished listening. The server accepts it but stamps receipt time for now. */
  occurredAt: string;
}

export interface CompleteReadingResponse {
  outcome: "Recorded" | "AlreadyCompleted";
}

export function completeReading(request: CompleteReadingRequest): Promise<CompleteReadingResponse> {
  return apiFetch<CompleteReadingResponse>("/v1/skills/complete-reading", { method: "POST", body: request });
}
