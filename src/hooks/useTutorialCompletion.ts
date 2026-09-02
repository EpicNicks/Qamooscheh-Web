// Server-synced now (POST /v1/onboarding/complete, surfaced back on
// GET /v1/bootstrap as onboardingComplete) — lib/tutorialCompletionStore.ts
// was the local-only placeholder before that backend flag existed.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBootstrap } from "./useBootstrap";
import { completeOnboarding } from "../api/onboarding";
import type { BootstrapResponse } from "../types/api";

export function useTutorialCompletion() {
  const bootstrap = useBootstrap();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: ({ onboardingComplete }) => {
      queryClient.setQueryData<BootstrapResponse>(["bootstrap"], (current) =>
        current ? { ...current, onboardingComplete } : current,
      );
    },
  });

  /** Called on both finishing the tutorial and skipping it — either way, it's been shown once and shouldn't be forced again. */
  function markComplete() {
    mutation.mutate();
  }

  return { completed: bootstrap.data?.onboardingComplete ?? false, markComplete };
}
