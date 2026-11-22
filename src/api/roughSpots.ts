// GET /v1/sessions/rough-spots — SessionsController. `listening` is left off:
// omitted means exclude, which is what Repack wants (listening is a lesson kind
// of its own here).
import { apiFetch } from "./httpClient";
import type { RoughSpotsResponse } from "../types/api";

/** How many rough words one Repack takes. The server's default and what saved-words practice uses. */
export const ROUGH_SPOT_WORDS = 10;

export function getRoughSpots(words: number = ROUGH_SPOT_WORDS): Promise<RoughSpotsResponse> {
  return apiFetch<RoughSpotsResponse>(`/v1/sessions/rough-spots?words=${words}`);
}
