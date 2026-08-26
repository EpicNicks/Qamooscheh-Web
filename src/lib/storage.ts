// Auth token persistence. localStorage (not memory-only) so a page reload
// doesn't force a re-login — refresh tokens are opaque and rotated on every
// use server-side (RefreshToken.cs), so a stolen value from local storage is
// no worse than a stolen cookie would be for this app's threat model.

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
  const userId = localStorage.getItem(USER_ID_KEY);
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const accessTokenExpiresAt = localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!userId || !accessToken || !accessTokenExpiresAt || !refreshToken) return null;
  return { userId, accessToken, accessTokenExpiresAt, refreshToken };
}

export function saveSession(session: StoredSession): void {
  localStorage.setItem(USER_ID_KEY, session.userId);
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  localStorage.setItem(ACCESS_TOKEN_EXPIRES_AT_KEY, session.accessTokenExpiresAt);
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
}

export function clearSession(): void {
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
