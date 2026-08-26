// v1/sessions/submit — SessionSubmitController.cs (API_SPEC.md §2.3). Always
// an array (even for one live session) — see SubmitSessionsRequest's own
// doc comment on the backend for why.
import { apiFetch } from "./httpClient";
import type { SubmittedSession, SubmitSessionsResponse } from "../types/api";

export function submitSessions(sessions: SubmittedSession[]): Promise<SubmitSessionsResponse> {
  return apiFetch<SubmitSessionsResponse>("/v1/sessions/submit", {
    method: "POST",
    body: { sessions },
  });
}
