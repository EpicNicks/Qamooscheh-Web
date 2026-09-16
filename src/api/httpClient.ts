// The one place that talks to Qamooscheh.Api over HTTP. Every api/*.ts
// module (other than auth.ts's register/login/google, which are
// [AllowAnonymous]) goes through `apiFetch`, which:
//   - prefixes API_BASE_URL and injects `Authorization: Bearer <accessToken>`
//   - refreshes up front when the stored token is at/near its expiry, rather
//     than paying a 401 to find that out
//   - on a 401, refreshes once (de-duplicated across concurrent callers) and
//     retries the original request exactly once — or retries straight away
//     with the token another caller's refresh already landed
//   - throws ApiError (status + the controller's `{ error, reason? }` body)
//     for every non-2xx response, including the retried one
//
// Deliberately does NOT import api/auth.ts, to avoid a refresh call routing
// back through this same 401-handling path. It talks to POST /v1/auth/refresh
// directly with a plain fetch instead.
import { API_BASE_URL } from "../config";
import { clearSession, loadSession, saveSession, type StoredSession } from "../lib/storage";
import type { ApiErrorBody, AuthResponse } from "../types/api";

export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.error ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** True once a refresh attempt has failed and the session has been cleared — pages should redirect to /login. */
export class SessionExpiredError extends Error {
  constructor() {
    super("Session expired; please sign in again.");
    this.name = "SessionExpiredError";
  }
}

/**
 * A refresh resolved after the session it started from was replaced — the user
 * signed out, or signed in as someone else, mid-flight. Deliberately NOT a
 * SessionExpiredError: whoever is signed in now is fine, it's only this one
 * request that has nowhere to land, so pages must not redirect to /login on it.
 */
export class StaleRefreshError extends Error {
  constructor() {
    super("The session changed while the token refresh was in flight.");
    this.name = "StaleRefreshError";
  }
}

/**
 * How close to `accessTokenExpiresAt` a stored token has to be before a
 * request refreshes it up front instead of spending a guaranteed 401 +
 * refresh + retry round trip on it. Wide enough to cover clock skew between
 * this browser and the API and the request's own flight time.
 */
const EXPIRY_REFRESH_BUFFER_MS = 30_000;

/** True when the stored access token is already expired, or will be by the time this request lands. An unparseable timestamp answers false — the 401 path still catches it. */
function isExpiringSoon(accessTokenExpiresAt: string): boolean {
  const expiresAt = Date.parse(accessTokenExpiresAt);
  return !Number.isNaN(expiresAt) && expiresAt - Date.now() <= EXPIRY_REFRESH_BUFFER_MS;
}

let refreshPromise: Promise<string> | null = null;

/**
 * True when storage still holds the exact session this refresh started from.
 * A refresh is a network round trip, and the user can sign out — and back in
 * as another account — while it is in flight; the refresh token is the sharper
 * identity check of the two, since signing back in as the *same* user also
 * makes an older refresh's result stale.
 */
function isSessionCurrent(session: StoredSession): boolean {
  const current = loadSession();
  return current !== null && current.userId === session.userId && current.refreshToken === session.refreshToken;
}

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const session = loadSession();
    if (!session) throw new SessionExpiredError();

    const response = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });

    // Whatever the response says, it is about a session storage no longer
    // holds. Acting on it either way corrupts the login that replaced it —
    // saving would authenticate later requests as the signed-out account while
    // React still names the new one, clearing would sign the new one out.
    if (!isSessionCurrent(session)) throw new StaleRefreshError();

    if (!response.ok) {
      // Only a status that unambiguously means "the API is briefly unwell"
      // is treated as recoverable — everything else (a flat-out rejection,
      // or a status this client doesn't specifically recognize) ends the
      // session. The safe default is to clear: leaving a truly-dead session
      // in storage strands the learner in a screen that fails forever and
      // never redirects to /login, which is worse than one avoidable sign-out.
      const isRetryable = response.status === 408 || response.status === 429 || response.status >= 500;
      if (isRetryable) {
        throw new ApiError(response.status, await parseErrorBody(response));
      }
      clearSession();
      throw new SessionExpiredError();
    }

    const auth = (await response.json()) as AuthResponse;
    // Re-check right before writing: `await response.json()` above is itself
    // a suspension point the user can sign out and back in across, so the
    // currency check up top doesn't cover this write on its own.
    if (!isSessionCurrent(session)) throw new StaleRefreshError();
    saveSession({
      userId: auth.userId,
      accessToken: auth.accessToken,
      accessTokenExpiresAt: auth.accessTokenExpiresAt,
      refreshToken: auth.refreshToken,
    });
    return auth.accessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export interface ApiFetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** Skip attaching an Authorization header — only auth.ts's register/login/google need this. */
  anonymous?: boolean;
  signal?: AbortSignal;
}

async function doFetch(path: string, options: ApiFetchOptions, accessToken: string | null): Promise<Response> {
  // Only describe a body that actually exists. `Content-Type: application/json`
  // is not a CORS-safelisted value, so setting it on a bodiless GET forces a
  // preflight OPTIONS round trip before every single read.
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  return fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });
}

async function parseErrorBody(response: Response): Promise<ApiErrorBody | null> {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const session = options.anonymous ? null : loadSession();

  // Refresh BEFORE sending when the stored token is spent: the 401 path below
  // would arrive at the same place, one wasted round trip later.
  let accessToken = session?.accessToken ?? null;
  if (session && isExpiringSoon(session.accessTokenExpiresAt)) {
    accessToken = await refreshAccessToken();
  }

  let response = await doFetch(path, options, accessToken);

  if (response.status === 401 && !options.anonymous && session) {
    // A concurrent request may have refreshed while this one was in flight —
    // its 401 was already decided against the token it left with. Refreshing
    // again would rotate a token that's perfectly good, so only refresh when
    // storage still holds the same token this request actually used.
    const currentAccessToken = loadSession()?.accessToken ?? null;
    const retryToken =
      currentAccessToken && currentAccessToken !== accessToken ? currentAccessToken : await refreshAccessToken();
    response = await doFetch(path, options, retryToken);
  }

  if (!response.ok) throw new ApiError(response.status, await parseErrorBody(response));

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
