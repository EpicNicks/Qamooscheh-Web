// Central runtime config, read once from Vite env vars (import.meta.env.VITE_*).
// See .env.example for the full list and local-dev defaults.

/** Qamooscheh.Api, default dev port from Properties/launchSettings.json. */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5239";

/**
 * Root of the artifact CDN that serves `course/...` and `grader/...`
 * (API_SPEC.md §1 — Api is never on this path). Point this at wherever
 * `artifacts/` is actually being served from in dev (e.g. a static file
 * server rooted at the backend repo's `artifacts/` folder).
 */
export const CONTENT_BASE_URL: string =
  import.meta.env.VITE_CONTENT_BASE_URL ?? "http://localhost:8080";

/** Google Identity Services client id — must match Auth:GoogleClientId server-side. */
export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

/**
 * This build's version: the commit it was built from, passed in as
 * VITE_APP_VERSION by the deploy workflow (Dockerfile build arg). "dev" for
 * a local build. Sent to the API as X-Client (api/httpClient.ts).
 */
export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION || "dev";

/** X-Client's value: which app this is and which build, so the API can group exercise reports by build. */
export const CLIENT_HEADER = `web/${APP_VERSION}`;
