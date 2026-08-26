import { useQuery } from "@tanstack/react-query";
import { getCurrentLeague } from "../api/leagues";

/** GET /v1/leagues/current (API_SPEC.md §9). 404s (NoActiveLeagueException) surface as a normal error state — not every user has an active league. */
export function useCurrentLeague() {
  return useQuery({
    queryKey: ["league", "current"],
    queryFn: getCurrentLeague,
  });
}
