// v1/sessions/submit — SessionSubmitController.cs (API_SPEC.md §2.3). Always
// an array (even for one live session) — see SubmitSessionsRequest's own
// doc comment on the backend for why.
import { apiFetch } from "./httpClient";
import type { QueuedSession } from "../lib/offlineQueue";
import type { SubmittedSession, SubmitSessionsResponse } from "../types/api";

/** Queue claim fields are local bookkeeping; they must not reach the server. */
function toWire(session: QueuedSession): SubmittedSession {
  const { claimedBy: _by, claimedAt: _at, ...wire } = session;
  return wire;
}

export function submitSessions(sessions: QueuedSession[], options?: { keepalive?: boolean; asUserId?: string }): Promise<SubmitSessionsResponse> {
  return apiFetch<SubmitSessionsResponse>("/v1/sessions/submit", {
    method: "POST",
    body: { sessions: sessions.map(toWire) },
    keepalive: options?.keepalive,
    asUserId: options?.asUserId,
  });
}
