// v1/prefs — PrefsController.cs. Scoped to the caller's pinned course
// server-side; PUT is a full overwrite, matching profile.ts's own PUT.
import { apiFetch } from "./httpClient";
import type { PrefsResponse, UpdatePrefsRequest } from "../types/api";

export function getPrefs(): Promise<PrefsResponse> {
  return apiFetch<PrefsResponse>("/v1/prefs");
}

export function updatePrefs(request: UpdatePrefsRequest): Promise<PrefsResponse> {
  return apiFetch<PrefsResponse>("/v1/prefs", { method: "PUT", body: request });
}
