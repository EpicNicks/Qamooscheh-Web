// Auth token persistence. localStorage (not memory-only) so a page reload
// doesn't force a re-login — refresh tokens are opaque and rotated on every
// use server-side (RefreshToken.cs), so a stolen value from local storage is
// no worse than a stolen cookie would be for this app's threat model.
//
// Through safeStorage, not localStorage directly: loadSession() runs in
// AuthProvider's lazy state initializer, where a throwing storage access
// (Safari private mode, some webviews) would white-screen the app.
import { safeStorage } from "./safeStorage";

const ACCESS_TOKEN_KEY = "qamooscheh.accessToken";
const ACCESS_TOKEN_EXPIRES_AT_KEY = "qamooscheh.accessTokenExpiresAt";
const REFRESH_TOKEN_KEY = "qamooscheh.refreshToken";
const USER_ID_KEY = "qamooscheh.userId";

export interface StoredSession {
  userId: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
}

export function loadSession(): StoredSession | null {
  const userId = safeStorage.getItem(USER_ID_KEY);
  const accessToken = safeStorage.getItem(ACCESS_TOKEN_KEY);
  const accessTokenExpiresAt = safeStorage.getItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
  const refreshToken = safeStorage.getItem(REFRESH_TOKEN_KEY);
  if (!userId || !accessToken || !accessTokenExpiresAt || !refreshToken) return null;
  return { userId, accessToken, accessTokenExpiresAt, refreshToken };
}

export function saveSession(session: StoredSession): void {
  safeStorage.setItem(USER_ID_KEY, session.userId);
  safeStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  safeStorage.setItem(ACCESS_TOKEN_EXPIRES_AT_KEY, session.accessTokenExpiresAt);
  safeStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
}

const sessionClearedListeners = new Set<() => void>();

/**
 * Notified whenever `clearSession()` runs. The session can be cleared from
 * outside React — httpClient's refresh path drops it when a refresh fails —
 * and AuthProvider's `isAuthenticated` is state seeded once from storage, so
 * without this signal it stays true against an emptied store and RequireAuth
 * never redirects. Returns an unsubscribe.
 */
export function onSessionCleared(listener: () => void): () => void {
  sessionClearedListeners.add(listener);
  return () => {
    sessionClearedListeners.delete(listener);
  };
}

export function clearSession(): void {
  safeStorage.removeItem(USER_ID_KEY);
  safeStorage.removeItem(ACCESS_TOKEN_KEY);
  safeStorage.removeItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
  safeStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionClearedListeners.forEach((listener) => listener());
}
