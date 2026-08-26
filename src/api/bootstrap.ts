// v1/bootstrap — Bootstrap/BootstrapController.cs (API_SPEC.md §2.1).
import { apiFetch } from "./httpClient";
import type { BootstrapResponse } from "../types/api";

export function getBootstrap(): Promise<BootstrapResponse> {
  return apiFetch<BootstrapResponse>("/v1/bootstrap");
}
