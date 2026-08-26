import { useState } from "react";
import { useProfile, useUpdateProfile } from "../hooks/useProfile";
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
    <form className={styles.form} onSubmit={handleSubmit}>
      <h1>Profile</h1>
      <p className={styles.hint}>
        This is what friends and leaderboards see — nothing is shown publicly until you set a display name.
      </p>
      {updateProfile.isError && <ErrorBanner message={errorMessage(updateProfile.error, "Couldn't save your profile.")} />}
      <label className={styles.field}>
        Display name
        <input
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          required
          maxLength={64}
        />
      </label>
      <label className={styles.field}>
        Full name (optional, private)
        <input
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          maxLength={128}
        />
      </label>
      <label className={styles.field}>
        Country (optional, ISO 2-letter, e.g. US)
        <input
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })}
          maxLength={2}
          pattern="[A-Z]{2}"
        />
      </label>
      <Button type="submit" disabled={updateProfile.isPending}>
        {updateProfile.isPending ? "Saving…" : "Save"}
      </Button>
      {updateProfile.isSuccess && <p className={styles.saved}>Saved.</p>}
    </form>
  );
}
