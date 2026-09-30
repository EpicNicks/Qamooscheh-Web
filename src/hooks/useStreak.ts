import { useQuery } from "@tanstack/react-query";
import { getStreak } from "../api/streak";

/**
 * GET /v1/streak (API_SPEC.md §2.12). Invalidated wherever a submit lands a
 * day in daily_activity — useLessonEngine's finishLesson, useSkillWalkthrough,
 * useCheckpoint's submit, and useOfflineQueueFlush — so finishing a lesson
 * ticks the header number over without a refresh. The day rolling over with
 * the app left open is covered by react-query's default refetch-on-focus.
 */
export function useStreak() {
  return useQuery({
    queryKey: ["streak"],
    queryFn: getStreak,
  });
}
