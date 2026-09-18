import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../components/common/Button";
import { useTutorialCompletion } from "../../hooks/useTutorialCompletion";
import { OnboardingTutorialStep } from "../onboarding/OnboardingTutorialStep";
import styles from "./SettingsPage.module.css";

/** The mock-content ONBOARDING walkthrough (distinct from the in-lesson RealLessonOverlay spotlight, which now has its own "Replay the lesson walkthrough" control inside a lesson's own settings cog — see LanguageSettingsButton.tsx). */
export function TutorialSection() {
  const tutorial = useTutorialCompletion();
  const [replaying, setReplaying] = useState(false);

  return (
    <div className={styles.section}>
      <h2>Tutorial</h2>
      <Button type="button" variant="secondary" onClick={() => setReplaying(true)}>
        {tutorial.completed ? "Replay the intro tutorial" : "Take the intro tutorial"}
      </Button>

      {replaying &&
        createPortal(
          <div className={styles.tutorialOverlay}>
            <div className={styles.tutorialCard}>
              <OnboardingTutorialStep
                onDone={() => {
                  tutorial.markComplete();
                  setReplaying(false);
                }}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
