// v1/courses — CoursesController.cs (catalog, enroll, switch-active) and
// v1/activity — ActivityController.cs.
//
// Enroll and switch-active both answer with a BootstrapResponse rather than a
// body of their own, so a caller can drop either straight into the cache slot
// it already keeps for bootstrap (see useEnrollment.ts).
import { apiFetch } from "./httpClient";
import type {
  ActivityResponse,
  BootstrapResponse,
  CourseCatalogResponse,
  RollForwardCourseRequest,
  SwitchActiveCourseRequest,
} from "../types/api";

/** Every course with a CURRENT published version — enrolling in anything listed here is guaranteed to resolve a version to pin. */
export function getCourseCatalog(): Promise<CourseCatalogResponse> {
  return apiFetch<CourseCatalogResponse>("/v1/courses");
}

/** Idempotent: enrolling in a course the caller already has is a no-op server-side (it never re-pins an in-progress course to a newer version). */
export function enrollInCourse(courseCode: string): Promise<BootstrapResponse> {
  return apiFetch<BootstrapResponse>(`/v1/courses/${encodeURIComponent(courseCode)}/enroll`, { method: "POST" });
}

/** 409 if the caller isn't enrolled in `courseCode` — switching is not a way to join a course. */
export function switchActiveCourse(courseCode: string): Promise<BootstrapResponse> {
  const body: SwitchActiveCourseRequest = { courseCode };
  return apiFetch<BootstrapResponse>("/v1/courses/active", { method: "PUT", body });
}

/**
 * POST /v1/courses/{code}/roll-forward. `toVersion` must be exactly the
 * version `BootstrapResponse.update` offered — see RollForwardCourseRequest.
 * 200 answers with a full BootstrapResponse (the new pin/position/manifest);
 * 409 means not enrolled or not yet eligible (body carries
 * `highestEligibleVersion`); 503 means that version isn't published yet and
 * is safe to retry.
 */
export function rollForwardCourse(courseCode: string, toVersion: number): Promise<BootstrapResponse> {
  const body: RollForwardCourseRequest = { toVersion };
  return apiFetch<BootstrapResponse>(`/v1/courses/${encodeURIComponent(courseCode)}/roll-forward`, {
    method: "POST",
    body,
  });
}

/**
 * One course's daily activity history, newest day first. Data-only this pass —
 * nothing renders it yet; it's the read half of a future per-language
 * dashboard. An empty list is the honest answer for a course never studied.
 */
export function getActivity(courseCode: string): Promise<ActivityResponse> {
  return apiFetch<ActivityResponse>(`/v1/activity/${encodeURIComponent(courseCode)}`);
}
