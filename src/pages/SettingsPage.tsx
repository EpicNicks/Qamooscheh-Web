import { useState } from "react";
import { createPortal } from "react-dom";
import { useBootstrap } from "../hooks/useBootstrap";
import { usePrefs, useUpdatePrefs } from "../hooks/usePrefs";
import { useTutorialCompletion } from "../hooks/useTutorialCompletion";
import { Button } from "../components/common/Button";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { errorMessage } from "../lib/errors";
import { OnboardingTutorialStep } from "./onboarding/OnboardingTutorialStep";
import type { KeyboardMode, Register, ScriptMode } from "../domain/enums";
import type { PrefsResponse, UpdatePrefsRequest } from "../types/api";
import styles from "./SettingsPage.module.css";

/**
 * How the learner wants to study their currently-pinned course
 * (GET/PUT /v1/prefs) — scoped server-side per (user, course), not a global
 * account setting, so these values are specific to the language the learner
 * is studying right now and will read differently again after switching
 * courses.
 */
export function SettingsPage() {
  const bootstrap = useBootstrap();
  const prefsQuery = usePrefs();
  const updatePrefs = useUpdatePrefs();
  const tutorial = useTutorialCompletion();
  const [form, setForm] = useState<UpdatePrefsRequest | null>(null);
  // What the form in hand was seeded from. Unlike ProfilePage's one-shot
  // seeding, these values are course-scoped: the header's CourseSwitcher can
  // change which course they describe while this page stays mounted, and a
  // form still holding the previous course's answers would write them over
  // the new course's on Save.
  const [seeded, setSeeded] = useState<{ courseCode: string | null; prefs: PrefsResponse } | null>(null);
  const [replayingTutorial, setReplayingTutorial] = useState(false);

  const courseCode = bootstrap.data?.course?.code ?? null;

  if (prefsQuery.isLoading) return <Spinner label="Loading settings…" />;
  if (prefsQuery.isError) return <ErrorBanner message={errorMessage(prefsQuery.error, "Couldn't load your settings.")} />;
  if (!prefsQuery.data) return null;

  // A switch swaps `["bootstrap"]` in synchronously but only *invalidates*
  // `["prefs"]`, so for the length of that refetch the body in hand still
  // belongs to the course we just left — show the spinner rather than seed a
  // form from it that Save could fire off in the meantime.
  if (seeded !== null && seeded.courseCode !== courseCode && prefsQuery.isFetching) {
    return <Spinner label="Loading settings…" />;
  }

  // Render-time seeding (no useEffect), re-run whenever the prefs body or the
  // course it describes changes. react-query's structural sharing keeps
  // `data` identity stable across refetches that return the same values, so
  // an ordinary background refetch doesn't discard edits in progress.
  if (seeded === null || seeded.prefs !== prefsQuery.data || seeded.courseCode !== courseCode) {
    setSeeded({ courseCode, prefs: prefsQuery.data });
    setForm(prefsQuery.data);
    return null;
  }

  if (form === null) return null;

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
