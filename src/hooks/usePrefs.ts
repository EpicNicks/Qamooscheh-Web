import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPrefs, updatePrefs } from "../api/prefs";
import type { PrefsResponse, UpdatePrefsRequest } from "../types/api";

export function usePrefs() {
  return useQuery({
    queryKey: ["prefs"],
    queryFn: getPrefs,
  });
}

export function useUpdatePrefs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: UpdatePrefsRequest) => updatePrefs(request),
    // Optimistic: scriptMode now has an immediate on-screen effect (the
    // "Text Mode" toggle's ruby/romanized rendering, GitHub #7), so a round
    // trip before it visibly does anything would read as broken. Safe to
    // apply the request body straight onto the cache — PrefsResponse IS
    // UpdatePrefsRequest (types/api.ts), so this is what the server would
    // echo back on success anyway.
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey: ["prefs"] });
      const previous = queryClient.getQueryData<PrefsResponse>(["prefs"]);
      queryClient.setQueryData(["prefs"], request);
      return { previous };
    },
    onError: (_err, _request, context) => {
      if (context?.previous) queryClient.setQueryData(["prefs"], context.previous);
    },
    onSuccess: (prefs) => {
      queryClient.setQueryData(["prefs"], prefs);
      // Changing desiredRetention recomputes due_at server-side for every
      // card in the pinned course (PrefsService), so the next session plan
      // can genuinely differ — don't serve a stale one from cache.
      queryClient.invalidateQueries({ queryKey: ["sessionPlan"] });
    },
  });
}
