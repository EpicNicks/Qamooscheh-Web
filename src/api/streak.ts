// v1/streak — StreakController.cs (API_SPEC.md §2.12). One route, no
// parameters: the caller's one cross-course streak.
import { apiFetch } from "./httpClient";
import type { StreakResponse } from "../types/api";

export function getStreak(): Promise<StreakResponse> {
  return apiFetch<StreakResponse>("/v1/streak");
}
