import { useEffect, useRef, useState } from "react";
import { ApiError } from "../../api/httpClient";
import { checkUsernameAvailability } from "../../api/username";
import { Button } from "../../components/common/Button";
import { ErrorBanner } from "../../components/common/ErrorBanner";
import {
  createAvailabilityChecker,
  type AvailabilityChecker,
  type AvailabilityState,
} from "../../domain/usernameAvailability";
import { normalizeUsername, renameErrorCopy } from "../../domain/username";
import { useSetUsername, useUsername } from "../../hooks/useUsername";
import styles from "./Onboarding.module.css";

/**
 * Optional step: choose your own username. Every account already has an
 * auto-assigned one; Skip keeps it (no request, no rename clock). Choosing one
 * is free but starts the 30-day rename clock, which the copy says up front.
 * The live availability check can be stale by the time of Continue, so the PUT
 * is the real check and its rejection keeps the learner here.
 */
export function OnboardingUsernameStep({ onDone }: { onDone: () => void }) {
  const current = useUsername();
  const setUsername = useSetUsername();
  const [draft, setDraft] = useState("");
  const [availability, setAvailability] = useState<AvailabilityState>({
    kind: "idle",
  });
  const checker = useRef<AvailabilityChecker | null>(null);
  const currentHandle = current.data?.username ?? null;

  useEffect(() => {
    const instance = createAvailabilityChecker({
      check: checkUsernameAvailability,
      onChange: setAvailability,
      skip: (normalized) => normalized === currentHandle,
    });
    checker.current = instance;
    return () => instance.dispose();
  }, [currentHandle]);

  const normalized = normalizeUsername(draft);
  const isCurrent = normalized !== "" && normalized === currentHandle;
  const submitError =
    setUsername.error instanceof ApiError
      ? renameErrorCopy(setUsername.error.status, setUsername.error.body?.reason, setUsername.error.body?.canChangeAt)
      : setUsername.error
        ? renameErrorCopy(null, undefined)
        : null;
  // A failed or rate-limited check ("error") doesn't block Continue: the server re-checks on submit.
  const canSave =
    normalized !== "" &&
    !isCurrent &&
    availability.kind !== "invalid" &&
    availability.kind !== "unavailable" &&
    !setUsername.isPending;

  function handleChange(value: string) {
    setUsername.reset();
    setDraft(value);
    checker.current?.update(value);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setUsername.mutate(normalized, { onSuccess: onDone });
  }

  return (
    <form className={styles.step} onSubmit={handleSubmit}>
      <h1 className={styles.heading}>Pick a username</h1>
      <p className={styles.sub}>
        Friends find you by your username.
        {currentHandle ? ` You're @${currentHandle} for now.` : ""} Choose your own, or skip to keep it.
      </p>
      <p className={styles.sub}>
        Choosing one is free, but it starts a 30-day clock: you can change your username again once every 30 days.
      </p>

      {submitError && <ErrorBanner message={submitError} />}

      <label className={styles.field}>
        Username
        <input
          value={draft}
          onChange={(event) => handleChange(event.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          maxLength={21}
          aria-describedby="username-status"
          autoFocus
        />
      </label>
      <p id="username-status" className={styles.status} role="status" aria-live="polite">
        {availability.kind === "checking" && (
          <>
            <span className={styles.statusSpinner} aria-hidden="true" /> Checking…
          </>
        )}
        {availability.kind === "available" && <span className={styles.ok}>&#10003; @{normalized} is available</span>}
        {(availability.kind === "invalid" || availability.kind === "unavailable" || availability.kind === "error") && (
          <span className={styles.bad}>{availability.message}</span>
        )}
        {isCurrent && "That's already your username."}
      </p>

      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onDone}>
          Skip
        </Button>
        <Button type="submit" disabled={!canSave}>
          {setUsername.isPending ? "Saving…" : "Continue"}
        </Button>
      </div>
    </form>
  );
}
