import { useQuery } from "@tanstack/react-query";
import { getRoughSpots } from "../api/roughSpots";
import { useBootstrap } from "./useBootstrap";

export const ROUGH_SPOTS_KEY = ["roughSpots"] as const;

/**
 * The learner's rough spots (GET /v1/sessions/rough-spots). Derived on the
 * server from their review history, so it is re-read every time a screen that
 * offers it opens, and never kept once nothing is watching it. A failure
 * (409 before bootstrap, offline) just means "nothing to offer".
 */
export function useRoughSpots(enabled = true) {
  const bootstrap = useBootstrap();
  return useQuery({
    queryKey: ROUGH_SPOTS_KEY,
    queryFn: () => getRoughSpots(),
    enabled: enabled && bootstrap.isSuccess,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: false,
  });
}
