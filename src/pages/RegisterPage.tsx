import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/common/Button";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { GoogleSignInButton } from "../components/auth/GoogleSignInButton";
import { GOOGLE_CLIENT_ID } from "../config";
import { errorMessage } from "../lib/errors";
import styles from "./AuthPage.module.css";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register(email, password);
      // Not /path: a brand-new account is enrolled in nothing (registration
      // stopped implicitly provisioning a default course), so /path would only
      // bounce through RequireOnboarded to get here anyway.
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Couldn't create an account — that email may already be registered."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>Qamooscheh</div>
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
        <p className={styles.switch}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
