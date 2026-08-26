import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";
import * as authApi from "../api/auth";
import { clearSession, loadSession, saveSession, type StoredSession } from "../lib/storage";
import type { AuthResponse } from "../types/api";

export interface AuthContextValue {
  userId: string | null;
  isAuthenticated: boolean;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

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

  const register = useCallback(async (email: string, password: string) => {
    setSession(persist(await authApi.register(email, password)));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setSession(persist(await authApi.login(email, password)));
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    setSession(persist(await authApi.loginWithGoogle(idToken)));
  }, []);

  const logout = useCallback(async () => {
    const current = loadSession();
    clearSession();
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
