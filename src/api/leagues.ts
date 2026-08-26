// v1/leagues — LeaguesController.cs (API_SPEC.md §9). One route: the
// caller's own current cohort standings.
import { apiFetch } from "./httpClient";
import type { CurrentLeagueResponse } from "../types/api";

export function getCurrentLeague(): Promise<CurrentLeagueResponse> {
  return apiFetch<CurrentLeagueResponse>("/v1/leagues/current");
}
