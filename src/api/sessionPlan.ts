// v1/sessions/next — SessionPlanController.cs (API_SPEC.md §2.2).
import { apiFetch } from "./httpClient";
import type { SessionPlanResponse } from "../types/api";

export function getNextSession(): Promise<SessionPlanResponse> {
  return apiFetch<SessionPlanResponse>("/v1/sessions/next");
}
