// v1/lessons/completed — LessonsController.cs (API_SPEC.md §2.11): raw
// completion events for a theme-browsing client to grey out/filter what the
// caller has already done. Not "passed via checkpoint" or "behind the
// cursor" — derive those from bootstrap separately if needed.
import { apiFetch } from "./httpClient";
import type { CompletedLessonsResponse } from "../types/api";

export function getCompletedLessons(courseCode: string): Promise<CompletedLessonsResponse> {
  return apiFetch<CompletedLessonsResponse>(`/v1/lessons/completed?courseCode=${encodeURIComponent(courseCode)}`);
}
