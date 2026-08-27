import { useState } from "react";
import { useUpdateProfile } from "../../hooks/useProfile";
import { Button } from "../../components/common/Button";
import { ErrorBanner } from "../../components/common/ErrorBanner";
import { errorMessage } from "../../lib/errors";
import styles from "./Onboarding.module.css";

/**
 * Step one: what to call you. Writes through the existing
 * `PUT /v1/profile` (`useUpdateProfile`) — the endpoint already does exactly
 * this and validates the name server-side, so onboarding needed nothing new
 * on the profile side.
 *
 * `fullName`/`country` are sent as null rather than being asked for: the
 * endpoint is a full overwrite, not a patch, and this screen is the first
 * thing a new account sees — optional private fields belong on the profile
 * page, where there's a reason to be filling in a form.
 */
export function OnboardingNameStep({ onDone }: { onDone: () => void }) {
  const updateProfile = useUpdateProfile();
  const [displayName, setDisplayName] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await updateProfile.mutateAsync({ displayName: displayName.trim(), fullName: null, country: null });
      onDone();
    } catch {
      // Rendered from the mutation's own error state below.
    }
  }

  return (
    <form className={styles.step} onSubmit={handleSubmit}>
      <h1 className={styles.heading}>What should we call you?</h1>
      <p className={styles.sub}>This is the name friends and leaderboards see. You can change it later.</p>

      {updateProfile.isError && (
        <ErrorBanner message={errorMessage(updateProfile.error, "Couldn't save that name.")} />
      )}

      <label className={styles.field}>
        Display name
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
          // 40, matching ProfileService.MaxDisplayNameLength — better to stop
          // at the limit than to have the server reject a name already typed.
          maxLength={40}
          autoFocus
          autoComplete="nickname"
        />
      </label>

      <div className={styles.actions}>
        <Button type="submit" disabled={updateProfile.isPending || displayName.trim() === ""}>
          {updateProfile.isPending ? "Saving…" : "Continue"}
        </Button>
      </div>
    </form>
  );
}
