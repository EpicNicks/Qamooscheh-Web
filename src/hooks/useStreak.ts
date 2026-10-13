import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelStreakPause, getStreak, pauseStreak } from "../api/streak";
import { msUntilRollover } from "../domain/streak";
import type { StreakPauseRequest, StreakResponse } from "../types/api";

/**
 * GET /v1/streak (API_SPEC.md §2.12). Invalidated wherever a submit lands a
 * day in daily_activity — useLessonEngine's finishLesson, useSkillWalkthrough,
 * useCheckpoint's submit, and useOfflineQueueFlush — so finishing a lesson
 * ticks the header number over without a refresh. The day rolling over with
 * the app left open is covered by a refetch just after `nextDayStartsAt`
 * (plus react-query's default refetch-on-focus) — `today` is the key the
 * daily-goal ring reads XP under, so a stale one would pin it to yesterday.
 */
export function useStreak() {
  return useQuery({
    queryKey: ["streak"],
    queryFn: getStreak,
    refetchInterval: (query) => msUntilRollover(query.state.data),
  });
}

/** POST /v1/streak/pause — answers with the whole streak, which replaces the cache. */
export function usePauseStreak() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: StreakPauseRequest) => pauseStreak(request),
    onSuccess: (streak: StreakResponse) => queryClient.setQueryData(["streak"], streak),
  });
}

/** DELETE /v1/streak/pause — same whole-streak answer as booking one. */
export function useCancelStreakPause() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelStreakPause,
    onSuccess: (streak: StreakResponse) => queryClient.setQueryData(["streak"], streak),
  });
}
