// Keeps bootstrap's Stowage fields current without waiting for a refetch: the
// stow, snooze and mute answers carry the whole Stowage, and a submit result
// names the lesson a pass cleared. Every write is followed (by its caller) by
// an invalidate, so the next bootstrap has the last word.
import type { QueryClient } from "@tanstack/react-query";
import { withoutStowedLesson } from "../domain/stowage";
import { emitStowEvent } from "./stowEvents";
import type { BootstrapResponse, StowageUnit, SubmittedSessionResponse } from "../types/api";

const BOOTSTRAP_KEY = ["bootstrap"];

/** Replaces the cached Stowage (and the cursor, when the answer carries one). A cold cache is left alone. */
export function setCachedStowage(
  queryClient: QueryClient,
  stowage: StowageUnit[],
  position?: BootstrapResponse["position"],
): void {
  queryClient.setQueryData<BootstrapResponse>(BOOTSTRAP_KEY, (old) =>
    old ? { ...old, stowage, ...(position ? { position } : {}) } : old,
  );
}

/**
 * Drops lessons a pass cleared (SubmittedSessionResponse.stowCleared) from the
 * cached Stowage and from the stowable list, and announces each for the art.
 */
export function applyStowCleared(queryClient: QueryClient, results: readonly SubmittedSessionResponse[]): void {
  const cleared = results.map((r) => r.stowCleared).filter((key): key is string => !!key);
  if (cleared.length === 0) return;
  queryClient.setQueryData<BootstrapResponse>(BOOTSTRAP_KEY, (old) => {
    if (!old) return old;
    let stowage = old.stowage ?? [];
    for (const key of cleared) stowage = withoutStowedLesson(stowage, key);
    return {
      ...old,
      stowage,
      stowableLessonKeys: (old.stowableLessonKeys ?? []).filter((key) => !cleared.includes(key)),
    };
  });
  for (const key of cleared) emitStowEvent("stowCleared", key);
}
