// v1/vocab — VocabController.cs. Not course-scoped server-side (see
// types/api.ts's header on StarredVocabResponse); every mutation echoes back
// the caller's full updated tag list so a write self-reconciles without a
// follow-up GET.
import { apiFetch } from "./httpClient";
import type { BatchSetStarredRequest, SetStarredRequest, StarredVocabResponse } from "../types/api";

export function getStarredVocab(): Promise<StarredVocabResponse> {
  return apiFetch<StarredVocabResponse>("/v1/vocab/starred");
}

export function setStarred(request: SetStarredRequest): Promise<StarredVocabResponse> {
  return apiFetch<StarredVocabResponse>("/v1/vocab/starred", { method: "PUT", body: request });
}

export function batchSetStarred(request: BatchSetStarredRequest): Promise<StarredVocabResponse> {
  return apiFetch<StarredVocabResponse>("/v1/vocab/starred/batch", { method: "PUT", body: request });
}
