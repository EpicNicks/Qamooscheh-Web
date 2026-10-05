import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/common/Button";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { GoogleSignInButton } from "../components/auth/GoogleSignInButton";
import { RegistrationClosedNotice } from "../components/auth/RegistrationClosedNotice";
import { useRegistrationStatus } from "../hooks/useRegistrationStatus";
import { GOOGLE_CLIENT_ID } from "../config";
import { errorMessage } from "../lib/errors";
import { registrationGate } from "../lib/registrationGate";
import styles from "./AuthPage.module.css";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The form shows only once the server has said registration is open. While
  // the first answer is pending, render neither the form nor a notice, rather
  // than flash one and swap it. A failed check is NOT "open": see
  // registrationGate for why.
  const registrationStatus = useRegistrationStatus();
  const gate = registrationGate(registrationStatus);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Caught here rather than left to the server round trip: the API's own
    // check (AuthContracts.cs's RegisterRequest.Validate) exists to guard
    // against a client that skips this, not to be this form's first line of
    // feedback.
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setIsSubmitting(true);
    try {
      await register(email, password, confirmPassword);
      // Not /path: a brand-new account is enrolled in nothing (registration
      // stopped implicitly provisioning a default course), so /path would only
      // bounce through RequireOnboarded to get here anyway.
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Couldn't create an account: that email may already be registered."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>ParsLing</div>

        {gate === "closed" && (
          <RegistrationClosedNotice message="ParsLing is in alpha and closed to new sign-ups right now. Already have an account? Sign in below." />
        )}

        {gate === "unknown" && (
          <>
            <RegistrationClosedNotice message="Couldn't check whether sign-ups are open right now. Already have an account? Sign in below." />
            <Button
              variant="secondary"
              disabled={registrationStatus.isFetching}
              onClick={() => void registrationStatus.refetch()}
            >
              {registrationStatus.isFetching ? "Checking…" : "Try again"}
            </Button>
          </>
        )}

        {gate === "open" && (
          <>
            {error && <ErrorBanner message={error} />}
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating account…" : "Create account"}
              </Button>
            </form>
            {GOOGLE_CLIENT_ID && (
              <>
                <div className={styles.divider}>or</div>
                <div className={styles.googleWrap}>
                  <GoogleSignInButton />
                </div>
              </>
            )}
          </>
        )}

        <p className={styles.switch}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
        <p className={styles.switch}>
          <Link to="/about">Learn more about ParsLing</Link>
        </p>
      </div>
    </div>
  );
}
