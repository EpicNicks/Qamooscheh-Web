import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPrefs, updatePrefs } from "../api/prefs";
import type { UpdatePrefsRequest } from "../types/api";

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
    onSuccess: (prefs) => {
      queryClient.setQueryData(["prefs"], prefs);
      // Changing desiredRetention recomputes due_at server-side for every
      // card in the pinned course (PrefsService), so the next session plan
      // can genuinely differ — don't serve a stale one from cache.
      queryClient.invalidateQueries({ queryKey: ["sessionPlan"] });
    },
  });
}
