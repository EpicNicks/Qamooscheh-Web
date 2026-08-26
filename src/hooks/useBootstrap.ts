import { useQuery } from "@tanstack/react-query";
import { getBootstrap } from "../api/bootstrap";

/**
 * GET /v1/bootstrap (API_SPEC.md §2.1). Every other screen keys its own
 * queries off this response's `course`/`position`, so it's the first thing
 * fetched after sign-in — SessionPlanController/SessionSubmitController both
 * answer 409 (NotProvisioned) if a call arrives before this one has run.
 */
export function useBootstrap() {
  return useQuery({
    queryKey: ["bootstrap"],
    queryFn: getBootstrap,
  });
}
