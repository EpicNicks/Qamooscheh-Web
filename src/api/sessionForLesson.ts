// v1/sessions/for-lesson — SessionForLessonController.cs (API_SPEC.md §2.11):
// the deep-dive/theme-browsing counterpart to GET /v1/sessions/next, a plan
// for one lesson the learner picked explicitly. Same response shape as
// getNextSession — Skills[].unitKey is null when the lesson has no journey
// position.
import { apiFetch } from "./httpClient";
import type { SessionPlanResponse } from "../types/api";

export function getSessionForLesson(lessonKey: string): Promise<SessionPlanResponse> {
  return apiFetch<SessionPlanResponse>(`/v1/sessions/for-lesson/${encodeURIComponent(lessonKey)}`);
}
