import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import * as authApi from "../api/auth";
import { clearSession, loadSession, onSessionCleared, saveSession, type StoredSession } from "../lib/storage";
import { queryClient } from "../queryClient";
import type { AuthResponse } from "../types/api";
import { AuthContext, type AuthContextValue } from "./AuthContext";

/**
 * Every cached query belongs to whoever was signed in when it was fetched, so
 * changing identity has to empty the cache — the module-level `queryClient` is
 * a singleton that outlives any one session.
 *
 * This became load-bearing with onboarding: `RequireOnboarded` and
 * `OnboardingFlow` both decide where to send someone from
 * `bootstrap.enrolledCourseCodes`, so a previous account's cached bootstrap
 * would route a brand-new account straight past onboarding and into a course
 * it isn't enrolled in. It is the right thing on sign-OUT regardless — profile,
 * friends and league standings shouldn't survive into the next person's session
 * on a shared browser.
 */
function resetCachedUserData() {
  queryClient.clear();
}

function persist(auth: AuthResponse): StoredSession {
  const session: StoredSession = {
    userId: auth.userId,
    accessToken: auth.accessToken,
    accessTokenExpiresAt: auth.accessTokenExpiresAt,
    refreshToken: auth.refreshToken,
  };
  saveSession(session);
  return session;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => loadSession());

  // httpClient clears the stored session when a token refresh fails, outside
  // any React render. Mirroring that here is what flips `isAuthenticated` to
  // false so RequireAuth sends an expired session back to /login, instead of
  // leaving every page stuck on "couldn't load" until a manual reload.
  useEffect(() => onSessionCleared(() => setSession(null)), []);

  const register = useCallback(async (email: string, password: string) => {
    const auth = await authApi.register(email, password);
    resetCachedUserData();
    setSession(persist(auth));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const auth = await authApi.login(email, password);
    resetCachedUserData();
    setSession(persist(auth));
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const auth = await authApi.loginWithGoogle(idToken);
    resetCachedUserData();
    setSession(persist(auth));
  }, []);

  const logout = useCallback(async () => {
    const current = loadSession();
    clearSession();
    resetCachedUserData();
    setSession(null);
    if (current) {
      // Best-effort: an already-expired or already-revoked refresh token
      // shouldn't block the local sign-out the user just asked for.
      await authApi.logout(current.refreshToken).catch(() => undefined);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      userId: session?.userId ?? null,
      isAuthenticated: session !== null,
      register,
      login,
      loginWithGoogle,
      logout,
    }),
    [session, register, login, loginWithGoogle, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
