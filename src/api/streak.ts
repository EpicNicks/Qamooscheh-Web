// v1/streak — StreakController.cs (API_SPEC.md §2.12): the caller's one
// cross-course streak, plus booking and cancelling a pause. Both pause routes
// answer with the whole StreakResponse, so the cache can be replaced outright.
import { apiFetch } from "./httpClient";
import type { StreakPauseRequest, StreakResponse } from "../types/api";

export function getStreak(): Promise<StreakResponse> {
  return apiFetch<StreakResponse>("/v1/streak");
}

export function pauseStreak(request: StreakPauseRequest): Promise<StreakResponse> {
  return apiFetch<StreakResponse>("/v1/streak/pause", { method: "POST", body: request });
}

export function cancelStreakPause(): Promise<StreakResponse> {
  return apiFetch<StreakResponse>("/v1/streak/pause", { method: "DELETE" });
}
