import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBootstrap } from "./useBootstrap";
import { getPrefs, updatePrefs } from "../api/prefs";
import type { PrefsResponse, UpdatePrefsRequest } from "../types/api";

// Prefs belong to one course (`user_prefs` is keyed (user_id, course_code)), so
// the cache is keyed by the active course too: right after a switch there is
// nothing under the new key yet, and the previous course's goal can't be read
// as the new one's. A late reply for the old course lands under the old key.
export function usePrefs() {
  const code = useBootstrap().data?.course?.code ?? null;
  return useQuery({
    queryKey: ["prefs", code],
    queryFn: getPrefs,
    enabled: code !== null,
  });
}

export function useUpdatePrefs() {
  const queryClient = useQueryClient();
  const code = useBootstrap().data?.course?.code ?? null;
  return useMutation({
    mutationFn: (request: UpdatePrefsRequest) => updatePrefs(request),
    // Optimistic: scriptMode now has an immediate on-screen effect (the
    // "Text Mode" toggle's ruby/romanized rendering, GitHub #7), so a round
    // trip before it visibly does anything would read as broken. Safe to
    // apply the request body straight onto the cache — PrefsResponse IS
    // UpdatePrefsRequest (types/api.ts), so this is what the server would
    // echo back on success anyway.
    onMutate: async (request) => {
      // The course the request was made under, kept for the callbacks: the
      // learner may have switched by the time it settles.
      await queryClient.cancelQueries({ queryKey: ["prefs", code] });
      const previous = queryClient.getQueryData<PrefsResponse>(["prefs", code]);
      queryClient.setQueryData(["prefs", code], request);
      return { previous, code };
    },
    onError: (_err, _request, context) => {
      if (context?.previous) queryClient.setQueryData(["prefs", context.code], context.previous);
    },
    onSuccess: (prefs, _request, context) => {
      queryClient.setQueryData(["prefs", context.code], prefs);
      // Changing desiredRetention recomputes due_at server-side for every
      // card in the pinned course (PrefsService), so the next session plan
      // can genuinely differ — don't serve a stale one from cache.
      queryClient.invalidateQueries({ queryKey: ["sessionPlan"] });
    },
  });
}
