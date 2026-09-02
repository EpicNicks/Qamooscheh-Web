import { useState } from "react";
import { createPortal } from "react-dom";
import { usePrefs, useUpdatePrefs } from "../hooks/usePrefs";
import { useTutorialCompletion } from "../hooks/useTutorialCompletion";
import { Button } from "../components/common/Button";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { errorMessage } from "../lib/errors";
import { OnboardingTutorialStep } from "./onboarding/OnboardingTutorialStep";
import type { KeyboardMode, Register, ScriptMode } from "../domain/enums";
import type { UpdatePrefsRequest } from "../types/api";
import styles from "./SettingsPage.module.css";

/**
 * How the learner wants to study their currently-pinned course
 * (GET/PUT /v1/prefs) — scoped server-side per (user, course), not a global
 * account setting, so these values are specific to the language the learner
 * is studying right now and will read differently again after switching
 * courses.
 */
export function SettingsPage() {
  const prefsQuery = usePrefs();
  const updatePrefs = useUpdatePrefs();
  const tutorial = useTutorialCompletion();
  const [form, setForm] = useState<UpdatePrefsRequest | null>(null);
  const [replayingTutorial, setReplayingTutorial] = useState(false);

  if (prefsQuery.isLoading) return <Spinner label="Loading settings…" />;
  if (prefsQuery.isError) return <ErrorBanner message={errorMessage(prefsQuery.error, "Couldn't load your settings.")} />;
  if (!prefsQuery.data) return null;

  // Same render-time seeding pattern as ProfilePage — no useEffect, since
  // there's nothing external to synchronize with beyond this first read.
  if (form === null) {
    setForm(prefsQuery.data);
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form) updatePrefs.mutate(form);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h1>Settings</h1>
      <p className={styles.hint}>These apply to the course you're currently studying.</p>
      {updatePrefs.isError && <ErrorBanner message={errorMessage(updatePrefs.error, "Couldn't save your settings.")} />}

      <label className={styles.field}>
        Script
        <select
          value={form.scriptMode}
          onChange={(e) => setForm({ ...form, scriptMode: e.target.value as ScriptMode })}
        >
          <option value="native">Native script</option>
          <option value="romanized">Romanized</option>
          <option value="both">Both</option>
        </select>
      </label>

      <label className={styles.field}>
        Register
        <select value={form.register} onChange={(e) => setForm({ ...form, register: e.target.value as Register })}>
          <option value="spoken">Spoken / colloquial</option>
          <option value="written">Written / formal</option>
          <option value="both">Both</option>
        </select>
      </label>

      <label className={styles.field}>
        Keyboard
        <select
          value={form.keyboardMode}
          onChange={(e) => setForm({ ...form, keyboardMode: e.target.value as KeyboardMode })}
        >
          <option value="contextual">Contextual letterforms</option>
          <option value="isolated">Isolated letterforms</option>
        </select>
      </label>

      <label className={`${styles.field} ${styles.checkboxRow}`}>
        <input
          type="checkbox"
          checked={form.autoplayAudio}
          onChange={(e) => setForm({ ...form, autoplayAudio: e.target.checked })}
        />
        Autoplay audio
      </label>

      <label className={styles.field}>
        Daily goal (minutes)
        <input
          type="number"
          min={1}
          max={1440}
          value={form.dailyGoalMinutes}
          onChange={(e) => setForm({ ...form, dailyGoalMinutes: Number(e.target.value) })}
        />
      </label>

      <label className={styles.field}>
        Target retention ({Math.round(form.desiredRetention * 100)}%)
        <input
          type="range"
          min={0.51}
          max={0.99}
          step={0.01}
          value={form.desiredRetention}
          onChange={(e) => setForm({ ...form, desiredRetention: Number(e.target.value) })}
        />
      </label>

      <Button type="submit" disabled={updatePrefs.isPending}>
        {updatePrefs.isPending ? "Saving…" : "Save"}
      </Button>
      {updatePrefs.isSuccess && <p className={styles.saved}>Saved.</p>}

      <Button type="button" variant="secondary" onClick={() => setReplayingTutorial(true)}>
        {tutorial.completed ? "Replay tutorial" : "Take the tutorial"}
      </Button>

      {replayingTutorial &&
        createPortal(
          <div className={styles.tutorialOverlay}>
            <div className={styles.tutorialCard}>
              <OnboardingTutorialStep
                onDone={() => {
                  tutorial.markComplete();
                  setReplayingTutorial(false);
                }}
              />
            </div>
          </div>,
          document.body,
        )}
    </form>
  );
}
