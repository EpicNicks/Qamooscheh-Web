// GET /v1/lessons/completed — react-query wrapper for theme-browsing views
// (API_SPEC.md §2.11). Invalidated alongside ["bootstrap"]/["sessionPlan"]
// by useLessonEngine's finishLesson and useCheckpoint's submit, so a
// just-completed lesson greys out without a hard refresh.
import { useQuery } from "@tanstack/react-query";
import { getCompletedLessons } from "../api/lessonsCompleted";

export function useCompletedLessons(courseCode: string | null | undefined) {
  return useQuery({
    queryKey: ["lessonsCompleted", courseCode],
    queryFn: () => getCompletedLessons(courseCode!),
    enabled: courseCode != null,
  });
}
