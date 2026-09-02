// v1/onboarding — OnboardingController.cs.
import { apiFetch } from "./httpClient";
import type { OnboardingCompleteResponse } from "../types/api";

export function completeOnboarding(): Promise<OnboardingCompleteResponse> {
  return apiFetch<OnboardingCompleteResponse>("/v1/onboarding/complete", { method: "POST" });
}
