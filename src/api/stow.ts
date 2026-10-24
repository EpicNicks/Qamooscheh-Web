// v1/journey/stow, /stowage/snooze, /stowage/mute — API_SPEC.md §2.18.
import { apiFetch } from "./httpClient";
import type { StowageActionResponse, StowResponse } from "../types/api";

export function stowLesson(lessonKey: string, options?: { asUserId?: string }): Promise<StowResponse> {
  return apiFetch<StowResponse>("/v1/journey/stow", {
    method: "POST",
    body: { lessonKey },
    asUserId: options?.asUserId,
  });
}

/** "Not yet" on the reminder: pushes every due lesson's next prompt out by 3 journey lessons. */
export function snoozeStowage(): Promise<StowageActionResponse> {
  return apiFetch<StowageActionResponse>("/v1/journey/stowage/snooze", { method: "POST" });
}

/** The reminder's X: stops reminders for the lessons in the Stowage right now. */
export function muteStowage(): Promise<StowageActionResponse> {
  return apiFetch<StowageActionResponse>("/v1/journey/stowage/mute", { method: "POST" });
}
