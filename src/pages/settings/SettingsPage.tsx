import { useState } from "react";
import { useBootstrap } from "../../hooks/useBootstrap";
import { usePrefs, useUpdatePrefs } from "../../hooks/usePrefs";
import { Button } from "../../components/common/Button";
import { Spinner } from "../../components/common/Spinner";
import { ErrorBanner } from "../../components/common/ErrorBanner";
import { errorMessage } from "../../lib/errors";
import { StudySection } from "./StudySection";
import { InputSection } from "./InputSection";
import { GoalsSection } from "./GoalsSection";
import { AppearanceSection } from "./AppearanceSection";
import { TutorialSection } from "./TutorialSection";
import type { PrefsResponse, UpdatePrefsRequest } from "../../types/api";
import styles from "./SettingsPage.module.css";

type SectionId = "study" | "input" | "goals" | "appearance" | "tutorial";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "study", label: "Study" },
  { id: "input", label: "Input" },
  { id: "goals", label: "Goals" },
  { id: "appearance", label: "Appearance" },
  { id: "tutorial", label: "Tutorial" },
];

/** Sections with no server-synced form field of their own — local-storage-backed (localAppPrefs.ts) and saved instantly on every change, so the shared Save button doesn't apply to them. */
const NO_SAVE_SECTIONS: readonly SectionId[] = ["appearance", "tutorial"];

/**
 * How the learner wants to study their currently-pinned course
 * (GET/PUT /v1/prefs) — scoped server-side per (user, course), not a global
 * account setting, so these values are specific to the language the learner
 * is studying right now and will read differently again after switching
 * courses.
 *
 * One shared form + one Save, across sections — a section-by-section save
 * would mean partial saves of one course-scoped record, and PUT /v1/prefs
 * always overwrites the whole thing, so there's no way to save "just Goals"
 * without silently resending whatever Study/Input hold at that moment
 * anyway. Splitting the FORM into sections is purely a navigation aid over
 * the same one PrefsResponse.
 */
export function SettingsPage() {
  const bootstrap = useBootstrap();
  const prefsQuery = usePrefs();
  const updatePrefs = useUpdatePrefs();
  const [form, setForm] = useState<UpdatePrefsRequest | null>(null);
  // What the form in hand was seeded from. Unlike ProfilePage's one-shot
  // seeding, these values are course-scoped: the header's CourseSwitcher can
  // change which course they describe while this page stays mounted, and a
  // form still holding the previous course's answers would write them over
  // the new course's on Save.
  const [seeded, setSeeded] = useState<{ courseCode: string | null; prefs: PrefsResponse } | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("study");

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

  /**
   * "Saved." describes the values as they were when the save succeeded — the
   * moment a field is changed again it's describing something that is no
   * longer on screen, so the mutation's success state is cleared on the next
   * edit rather than left standing until the page unmounts.
   */
  function editForm(patch: Partial<UpdatePrefsRequest>) {
    if (updatePrefs.isSuccess) updatePrefs.reset();
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  const sectionProps = { form, editForm, courseCode };

  return (
    <div className={styles.page}>
      <h1>Settings</h1>
      <p className={styles.hint}>These apply to the course you're currently studying.</p>

      <div className={styles.layout}>
        <nav className={styles.nav}>
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={section.id === activeSection ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <form className={styles.form} onSubmit={handleSubmit}>
          {updatePrefs.isError && <ErrorBanner message={errorMessage(updatePrefs.error, "Couldn't save your settings.")} />}

          {activeSection === "study" && <StudySection {...sectionProps} />}
          {activeSection === "input" && <InputSection {...sectionProps} />}
          {activeSection === "goals" && <GoalsSection {...sectionProps} />}
          {activeSection === "appearance" && <AppearanceSection {...sectionProps} />}
          {activeSection === "tutorial" && <TutorialSection />}

          {!NO_SAVE_SECTIONS.includes(activeSection) && (
            <>
              <Button type="submit" disabled={updatePrefs.isPending}>
                {updatePrefs.isPending ? "Saving…" : "Save"}
              </Button>
              {updatePrefs.isSuccess && <p className={styles.saved}>Saved.</p>}
            </>
          )}
        </form>
      </div>
    </div>
  );
}
