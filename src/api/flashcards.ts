// v1/flashcards — FlashcardsController.cs. A round is submitted once, when
// it ends; see types/api.ts's v1/flashcards header for what earns XP.
import { apiFetch } from "./httpClient";
import type { SubmitFlashcardsRequest, SubmitFlashcardsResponse } from "../types/api";

export function submitFlashcards(request: SubmitFlashcardsRequest): Promise<SubmitFlashcardsResponse> {
  return apiFetch<SubmitFlashcardsResponse>("/v1/flashcards/submit", { method: "POST", body: request });
}
