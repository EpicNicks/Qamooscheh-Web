// The one place that talks to Qamooscheh.Api over HTTP. Every api/*.ts
// module (other than auth.ts's register/login/google, which are
// [AllowAnonymous]) goes through `apiFetch`, which:
//   - prefixes API_BASE_URL and injects `Authorization: Bearer <accessToken>`
//   - on a 401, refreshes once (de-duplicated across concurrent callers) and
//     retries the original request exactly once
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
  const headers: Record<string, string> = { "Content-Type": "application/json" };
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
  let response = await doFetch(path, options, session?.accessToken ?? null);

  if (response.status === 401 && !options.anonymous && session) {
    const newAccessToken = await refreshAccessToken();
    response = await doFetch(path, options, newAccessToken);
  }

  if (!response.ok) throw new ApiError(response.status, await parseErrorBody(response));

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
