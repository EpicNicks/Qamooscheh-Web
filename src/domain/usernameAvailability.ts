// Debounced, cancel-on-stale availability check for a username being typed.
// Framework-free so the timing and stale-response rules can be tested with
// fake timers; the onboarding step drives it from an effect.
import { ApiError } from "../api/httpClient";
import type { UsernameAvailability } from "../api/username";
import { availabilityCopy, normalizeUsername, usernameFormatProblem } from "./username";

export type AvailabilityState =
  | { kind: "idle" }
  | { kind: "invalid"; message: string }
  | { kind: "checking" }
  | { kind: "available" }
  | { kind: "unavailable"; message: string }
  | { kind: "error"; message: string };

export const AVAILABILITY_DEBOUNCE_MS = 400;

export interface AvailabilityChecker {
  /** Feed the raw input value; runs the instant local check, then schedules the server check. */
  update(raw: string): void;
  dispose(): void;
}

export function createAvailabilityChecker(options: {
  check: (username: string, signal: AbortSignal) => Promise<UsernameAvailability>;
  onChange: (state: AvailabilityState) => void;
  /** A normalized value that needs no check (the learner's current handle). */
  skip?: (normalized: string) => boolean;
  delayMs?: number;
}): AvailabilityChecker {
  const { check, onChange, skip, delayMs = AVAILABILITY_DEBOUNCE_MS } = options;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  let disposed = false;

  function cancel() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    controller?.abort();
    controller = null;
  }

  function emit(state: AvailabilityState) {
    if (!disposed) onChange(state);
  }

  return {
    update(raw) {
      cancel();
      const normalized = normalizeUsername(raw);
      if (!normalized || skip?.(normalized)) return emit({ kind: "idle" });
      const problem = usernameFormatProblem(normalized);
      if (problem) return emit({ kind: "invalid", message: problem });

      emit({ kind: "checking" });
      timer = setTimeout(() => {
        timer = null;
        const mine = new AbortController();
        controller = mine;
        check(normalized, mine.signal).then(
          (result) => {
            if (mine.signal.aborted) return;
            emit(
              result.available
                ? { kind: "available" }
                : {
                    kind: "unavailable",
                    message: availabilityCopy(null, result.reason),
                  },
            );
          },
          (err: unknown) => {
            if (mine.signal.aborted) return;
            const status = err instanceof ApiError ? err.status : null;
            emit({ kind: "error", message: availabilityCopy(status, null) });
          },
        );
      }, delayMs);
    },
    dispose() {
      disposed = true;
      cancel();
    },
  };
}
