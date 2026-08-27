import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { enrollInCourse, switchActiveCourse } from "../api/courses";
import type { BootstrapResponse } from "../types/api";

/**
 * Both endpoints answer with a full BootstrapResponse for whichever course is
 * active *after* the call, so the fresh response goes straight into the
 * `["bootstrap"]` slot — the same `setQueryData` shortcut `useUpdatePrefs`
 * already takes, and the reason neither mutation needs to invalidate bootstrap
 * and refetch it.
 *
 * Everything else course-scoped has to go, though. `user_prefs` is keyed
 * `(user_id, course_code)` and the session plan/checkpoint plan are both
 * resolved against `active_course_code` server-side, so after a switch every
 * one of those cached bodies describes the course the learner just left.
 *
 * Content queries (`["content", ...]`) are deliberately NOT invalidated: they
 * are keyed by course code *and* version, so the other language's artifacts
 * sit in their own cache entries and a switch back re-reads them for free.
 */
function adoptBootstrap(queryClient: QueryClient, response: BootstrapResponse) {
  queryClient.setQueryData(["bootstrap"], response);
  queryClient.invalidateQueries({ queryKey: ["prefs"] });
  queryClient.invalidateQueries({ queryKey: ["sessionPlan"] });
  queryClient.invalidateQueries({ queryKey: ["checkpoint"] });
}

/**
 * POST /v1/courses/{code}/enroll. Adding a language does NOT make it active
 * (that would yank a learner out of the course they were mid-way through) —
 * except on the very first enrollment, where the server sets it active in the
 * same call so nobody is ever enrolled-but-studying-nothing.
 */
export function useEnrollCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseCode: string) => enrollInCourse(courseCode),
    onSuccess: (response) => adoptBootstrap(queryClient, response),
  });
}

/** PUT /v1/courses/active. 409 (ApiError) if the caller isn't enrolled in that course. */
export function useSwitchActiveCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseCode: string) => switchActiveCourse(courseCode),
    onSuccess: (response) => adoptBootstrap(queryClient, response),
  });
}
