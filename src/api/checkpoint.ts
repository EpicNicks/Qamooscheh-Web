// v1/checkpoint — CheckpointController.cs (API_SPEC.md §2.7): the
// placement-test/"gauntlet" flow for testing past material ahead of the
// learner's cursor.
import { apiFetch } from "./httpClient";
import type { CheckpointPlanResponse, CheckpointSubmitResponse, SubmitCheckpointRequest } from "../types/api";

export function getCheckpointPlan(targetUnitKey: string, targetSkillKey: string): Promise<CheckpointPlanResponse> {
  return apiFetch<CheckpointPlanResponse>(
    `/v1/checkpoint/${encodeURIComponent(targetUnitKey)}/${encodeURIComponent(targetSkillKey)}`,
  );
}

export function submitCheckpoint(request: SubmitCheckpointRequest): Promise<CheckpointSubmitResponse> {
  return apiFetch<CheckpointSubmitResponse>("/v1/checkpoint/submit", {
    method: "POST",
    body: request,
  });
}
