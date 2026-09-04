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
import { clearSession, loadSession, saveSession } from "../lib/storage";
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

    if (!response.ok) {
      clearSession();
      throw new SessionExpiredError();
    }

    const auth = (await response.json()) as AuthResponse;
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
