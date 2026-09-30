import { useState } from "react";
import { useProfile, useUpdateProfile } from "../hooks/useProfile";
import { useStreak } from "../hooks/useStreak";
import { formatStreakDays } from "../domain/streak";
import { StreakText } from "../components/common/StreakText";
import { Button } from "../components/common/Button";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { errorMessage } from "../lib/errors";
import styles from "./ProfilePage.module.css";

interface ProfileForm {
  displayName: string;
  fullName: string;
  country: string;
}

export function ProfilePage() {
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const [form, setForm] = useState<ProfileForm | null>(null);

  if (profile.isLoading) return <Spinner label="Loading profile…" />;
  if (profile.isError) return <ErrorBanner message={errorMessage(profile.error, "Couldn't load your profile.")} />;
  if (!profile.data) return null;

  // Seed the editable form from the fetched profile once, on first render
  // after it loads — a plain state adjustment during render (this render's
  // output is discarded; React re-renders immediately with `form` set)
  // rather than a useEffect, since there's nothing external to synchronize
  // with here.
  if (form === null) {
    setForm({
      displayName: profile.data.displayName ?? "",
      fullName: profile.data.fullName ?? "",
      country: profile.data.country ?? "",
    });
    return null;
  }

  /**
   * "Saved." describes the values as they were when the save succeeded — the
   * moment a field is edited again it's describing something that is no
   * longer on screen, so the mutation's success state is cleared on the next
   * edit rather than left standing until the page unmounts.
   */
  function editForm(patch: Partial<ProfileForm>) {
    if (updateProfile.isSuccess) updateProfile.reset();
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    updateProfile.mutate({
      displayName: form.displayName,
      fullName: form.fullName.trim() || null,
      country: form.country.trim() || null,
    });
  }

  return (
    <div className={styles.page}>
      <h1>Profile</h1>
      <StreakSummary />
      <form className={styles.form} onSubmit={handleSubmit}>
        <p className={styles.hint}>
          This is what friends and leaderboards see — nothing is shown publicly until you set a display name.
        </p>
        {updateProfile.isError && <ErrorBanner message={errorMessage(updateProfile.error, "Couldn't save your profile.")} />}
        <label className={styles.field}>
          Display name
          <input
            value={form.displayName}
            onChange={(e) => editForm({ displayName: e.target.value })}
            required
            maxLength={64}
          />
        </label>
        <label className={styles.field}>
          Full name (optional, private)
          <input
            value={form.fullName}
            onChange={(e) => editForm({ fullName: e.target.value })}
            maxLength={128}
          />
        </label>
        <label className={styles.field}>
          Country (optional, ISO 2-letter, e.g. US)
          <input
            value={form.country}
            onChange={(e) => editForm({ country: e.target.value.toUpperCase() })}
            maxLength={2}
            pattern="[A-Z]{2}"
          />
        </label>
        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? "Saving…" : "Save"}
        </Button>
        {updateProfile.isSuccess && <p className={styles.saved}>Saved.</p>}
      </form>
    </div>
  );
}

/**
 * Current and longest streak, side by side — the header only has room for the
 * current one. Read-only and outside the form: nothing here is editable, and
 * it's one streak across every language, not a per-course statistic. Renders
 * nothing while loading or on error rather than holding up the profile form
 * it sits above.
 */
function StreakSummary() {
  const streak = useStreak();
  if (!streak.data) return null;
  const { currentStreakDays, longestStreakDays, practicedToday } = streak.data;

  return (
    <section className={styles.streak} aria-label="Streak">
      <div className={styles.stat}>
        <StreakText days={currentStreakDays} className={styles.statValue}>
          {formatStreakDays(currentStreakDays)}
        </StreakText>
        <span className={styles.statLabel}>Current streak</span>
      </div>
      <div className={styles.stat}>
        <StreakText days={longestStreakDays} className={styles.statValue}>
          {formatStreakDays(longestStreakDays)}
        </StreakText>
        <span className={styles.statLabel}>Longest streak</span>
      </div>
      {currentStreakDays > 0 && !practicedToday && (
        <p className={styles.streakHint}>Practice today to keep your streak going.</p>
      )}
    </section>
  );
}
