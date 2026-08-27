import { CourseCatalogList } from "../../components/course/CourseCatalogList";
import { ErrorBanner } from "../../components/common/ErrorBanner";
import styles from "./Onboarding.module.css";

/**
 * Step two: which languages. The same `CourseCatalogList` the "+ add a
 * language" modal uses — `mode="multi"` (a new learner is deciding, so rows
 * toggle and an explicit Continue commits) and `showFacts` (this is a browse
 * context, which is the only place facts belong).
 *
 * Full-page chrome instead of the modal's overlay: there is nothing behind
 * this to dim, and nothing to dismiss back to.
 */
export function OnboardingLanguagesStep({
  onConfirm,
  isSubmitting,
  error,
}: {
  onConfirm: (courseCodes: string[]) => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  return (
    <div className={styles.step}>
      <h1 className={styles.heading}>What would you like to learn?</h1>
      <p className={styles.sub}>
        Pick one or more — you can study several at once and switch between them any time. The first one you pick is
        where you'll start.
      </p>

      {error && <ErrorBanner message={error} />}

      <CourseCatalogList
        mode="multi"
        showFacts
        autoFocusSearch
        alreadyEnrolledCodes={[]}
        isSubmitting={isSubmitting}
        confirmLabel="Start learning"
        onConfirm={onConfirm}
      />
    </div>
  );
}
