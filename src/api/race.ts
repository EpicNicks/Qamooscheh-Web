// v1/race — RaceController.cs (API_SPEC §2.8b). A race needs the network at
// both ends: start issues the FSRS weights, finish times and scores the run.
import { apiFetch } from "./httpClient";
import type {
  FinishRaceRequest,
  FinishRaceResponse,
  RaceBoardResponse,
  RaceDeviceClass,
  RaceMode,
  RaceScope,
  StartRaceRequest,
  StartRaceResponse,
} from "../types/api";

export function startRace(request: StartRaceRequest): Promise<StartRaceResponse> {
  return apiFetch<StartRaceResponse>("/v1/race/runs", { method: "POST", body: request });
}

export function finishRace(runId: string, request: FinishRaceRequest): Promise<FinishRaceResponse> {
  return apiFetch<FinishRaceResponse>(`/v1/race/runs/${encodeURIComponent(runId)}/finish`, { method: "POST", body: request });
}

export function getRaceBoard(params: {
  courseCode: string;
  mode: RaceMode;
  scope: RaceScope;
  deviceClass: RaceDeviceClass;
  hardcore: boolean;
  /** Any date in the wanted UTC week (`yyyy-MM-dd`), for the weekly scope; the current week if omitted. */
  week?: string;
}): Promise<RaceBoardResponse> {
  const query = new URLSearchParams({
    courseCode: params.courseCode,
    mode: params.mode,
    scope: params.scope,
    deviceClass: params.deviceClass,
    hardcore: String(params.hardcore),
  });
  if (params.week) query.set("week", params.week);
  return apiFetch<RaceBoardResponse>(`/v1/race/boards?${query}`);
}
