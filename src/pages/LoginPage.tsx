import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/common/Button";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { GoogleSignInButton } from "../components/auth/GoogleSignInButton";
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
        <p className={styles.switch}>
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
