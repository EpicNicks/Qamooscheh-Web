import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/common/Button";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { GoogleSignInButton } from "../components/auth/GoogleSignInButton";
import { RegistrationClosedNotice } from "../components/auth/RegistrationClosedNotice";
import { useRegistrationStatus } from "../hooks/useRegistrationStatus";
import { GOOGLE_CLIENT_ID } from "../config";
import { errorMessage } from "../lib/errors";
import styles from "./AuthPage.module.css";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login itself is NEVER gated by this -- a manually-provisioned account
  // still needs to sign in during the alpha. Only the "create an account"
  // invitation at the bottom changes. Google sign-in stays visible too: it's
  // the same login path for an EXISTING Google-linked user, and only fails
  // (with the backend's own clear message) if it would have created a new
  // account -- see AuthService.GoogleSignInAsync.
  const registrationStatus = useRegistrationStatus();
  const isClosed = registrationStatus.data?.enabled === false;

  const from = (location.state as { from?: { pathname: string } } | undefined)?.from?.pathname ?? "/path";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Couldn't sign in — check your email and password."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>ParsLing</div>
        {isClosed && (
          <RegistrationClosedNotice message="ParsLing is in alpha. Sign-ups are closed for now — if you've been given an account, sign in below." />
        )}
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
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
        {!isClosed && (
          <p className={styles.switch}>
            New here? <Link to="/register">Create an account</Link>
          </p>
        )}
        <p className={styles.switch}>
          <Link to="/about">Learn more about ParsLing</Link>
        </p>
      </div>
    </div>
  );
}
