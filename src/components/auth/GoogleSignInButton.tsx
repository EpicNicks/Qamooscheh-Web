import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { GOOGLE_CLIENT_ID } from "../../config";
import { initGoogleIdentity, renderGoogleButton } from "../../lib/googleIdentity";
import { ErrorBanner } from "../common/ErrorBanner";
import { errorMessage } from "../../lib/errors";

/**
 * Renders Google's own "Continue with Google" button and wires its
 * credential straight into AuthContext.loginWithGoogle -> POST
 * /v1/auth/google. One button covers both sign-up and sign-in:
 * AuthService.GoogleSignInAsync creates a new AppUser the first time a
 * given Google account is seen, same as any other OAuth "continue with"
 * flow — there's no separate Google register step to build.
 *
 * Renders nothing when VITE_GOOGLE_CLIENT_ID is unset, matching
 * .env.example's documented "leave blank to disable Google sign-in".
 */
export function GoogleSignInButton() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const from = (location.state as { from?: { pathname: string } } | undefined)?.from?.pathname ?? "/path";

    initGoogleIdentity(GOOGLE_CLIENT_ID, (idToken) => {
      loginWithGoogle(idToken)
        .then(() => navigate(from, { replace: true }))
        .catch((err: unknown) => setError(errorMessage(err, "Google sign-in failed.")));
    })
      .then(() => {
        if (!cancelled && container) renderGoogleButton(container);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load Google sign-in.");
      });

    return () => {
      cancelled = true;
    };
  }, [loginWithGoogle, navigate, location]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div>
      <div ref={containerRef} />
      {error && <ErrorBanner message={error} />}
    </div>
  );
}
