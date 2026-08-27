import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useBootstrap } from "../../hooks/useBootstrap";
import { useEnrollCourse, useSwitchActiveCourse } from "../../hooks/useEnrollment";
import { Spinner } from "../../components/common/Spinner";
import { errorMessage } from "../../lib/errors";
import { OnboardingLanguagesStep } from "./OnboardingLanguagesStep";
import { OnboardingNameStep } from "./OnboardingNameStep";
import styles from "./Onboarding.module.css";

type Step = "name" | "languages";

/**
 * First-signup onboarding: a name, then one or more languages. Two linear
 * steps held in local state rather than nested routes — there is nothing to
 * deep-link to here, and a browser Back button that landed someone half-way
 * through a setup they'd already finished would be worse than no history at all.
 *
 * Reached because a brand-new account bootstraps to `enrolledCourseCodes: []`
 * (registration no longer auto-provisions a default course), which is the same
 * condition `RequireOnboarded` redirects on.
 */
export function OnboardingFlow() {
  const bootstrap = useBootstrap();
  const navigate = useNavigate();
  const enroll = useEnrollCourse();
  const switchActive = useSwitchActiveCourse();
  const [step, setStep] = useState<Step>("name");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Once the first enroll lands, bootstrap reports an enrollment and the guard
  // below would bounce us to /path mid-way through enrolling the second
  // language. From the moment setup starts, this screen owns the navigation.
  const [hasStarted, setHasStarted] = useState(false);

  async function finish(courseCodes: string[]) {
    if (courseCodes.length === 0) return;
    setHasStarted(true);
    setIsSubmitting(true);
    setError(null);

    try {
      // Sequential, not Promise.all: every enroll answers with a full
      // BootstrapResponse that goes straight into the ["bootstrap"] cache
      // slot, and concurrent calls would race to be the last writer of it.
      for (const code of courseCodes) {
        await enroll.mutateAsync(code);
      }

      // The first language picked is the one to start in. The server already
      // makes the very first enrollment active, so this is usually a no-op —
      // it's here so the outcome doesn't silently depend on that.
      await switchActive.mutateAsync(courseCodes[0]);
      navigate("/path", { replace: true });
    } catch (err) {
      // Enrolling is idempotent server-side, so pressing the button again after
      // a partial failure re-runs the whole list safely rather than
      // double-enrolling anything.
      setError(errorMessage(err, "Couldn't finish setting up your courses. Please try again."));
      setIsSubmitting(false);
    }
  }

  if (bootstrap.isPending) return <Spinner label="Loading…" />;

  // Landing here a second time (a bookmark, a Back) shouldn't re-run setup.
  if (!hasStarted && (bootstrap.data?.enrolledCourseCodes.length ?? 0) > 0) {
    return <Navigate to="/path" replace />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>Qamooscheh</div>
        {step === "name" ? (
          <OnboardingNameStep onDone={() => setStep("languages")} />
        ) : (
          <OnboardingLanguagesStep onConfirm={finish} isSubmitting={isSubmitting} error={error} />
        )}
      </div>
    </div>
  );
}
