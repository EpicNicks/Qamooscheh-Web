// v1/profile — ProfileController.cs (API_SPEC.md §9). PUT is a full
// overwrite, not a patch (see UpdateProfileRequest's doc comment).
import { apiFetch } from "./httpClient";
import type { ProfileResponse, UpdateProfileRequest } from "../types/api";

export function getProfile(): Promise<ProfileResponse> {
  return apiFetch<ProfileResponse>("/v1/profile");
}

export function updateProfile(request: UpdateProfileRequest): Promise<ProfileResponse> {
  return apiFetch<ProfileResponse>("/v1/profile", { method: "PUT", body: request });
}
