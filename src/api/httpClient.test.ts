import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, SessionExpiredError, StaleRefreshError, apiFetch } from "./httpClient";
import { clearSession, loadSession, saveSession, type StoredSession } from "../lib/storage";

function session(userId: string, n: number, expiresAt: string): StoredSession {
  return {
    userId,
    accessToken: `${userId}-access-${n}`,
    accessTokenExpiresAt: expiresAt,
    refreshToken: `${userId}-refresh-${n}`,
  };
}

const PAST = new Date(Date.now() - 60_000).toISOString();
const FUTURE = new Date(Date.now() + 60 * 60_000).toISOString();

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function isRefresh(input: RequestInfo | URL): boolean {
  return String(input).endsWith("/v1/auth/refresh");
}

describe("httpClient refresh", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
    clearSession();
  });

  afterEach(() => {
    clearSession();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("clears the session when the refresh token is rejected outright", async () => {
    saveSession(session("a", 1, PAST));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => (isRefresh(input) ? json(401, { error: "invalid_grant" }) : json(200, {}))),
    );

    await expect(apiFetch("/v1/me")).rejects.toBeInstanceOf(SessionExpiredError);
    expect(loadSession()).toBeNull();
  });

  it("keeps the session when the refresh fails transiently", async () => {
    const original = session("a", 1, PAST);
    saveSession(original);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => (isRefresh(input) ? json(503, { error: "unavailable" }) : json(200, {}))),
    );

    const error = await apiFetch("/v1/me").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(503);
    expect(loadSession()).toEqual(original);
  });

  it("clears the session for a rejection status other than 401/403 (e.g. 400 invalid_grant)", async () => {
    saveSession(session("a", 1, PAST));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => (isRefresh(input) ? json(400, { error: "invalid_grant" }) : json(200, {}))),
    );

    await expect(apiFetch("/v1/me")).rejects.toBeInstanceOf(SessionExpiredError);
    expect(loadSession()).toBeNull();
  });

  it("does not clear the session of a different account on a rejected refresh", async () => {
    saveSession(session("a", 1, PAST));
    const b = session("b", 1, FUTURE);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (!isRefresh(input)) return json(200, {});
        // Signed out of A and into B while A's refresh was in flight.
        clearSession();
        saveSession(b);
        return json(401, { error: "invalid_grant" });
      }),
    );

    await expect(apiFetch("/v1/me")).rejects.toBeInstanceOf(StaleRefreshError);
    expect(loadSession()).toEqual(b);
  });

  it("discards a successful refresh whose session was replaced mid-flight", async () => {
    saveSession(session("a", 1, PAST));
    const b = session("b", 1, FUTURE);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (!isRefresh(input)) return json(200, {});
        clearSession();
        saveSession(b);
        return json(200, {
          userId: "a",
          accessToken: "a-access-2",
          accessTokenExpiresAt: FUTURE,
          refreshToken: "a-refresh-2",
        });
      }),
    );

    await expect(apiFetch("/v1/me")).rejects.toBeInstanceOf(StaleRefreshError);
    // A's rotated credentials must not have landed on top of B's live session.
    expect(loadSession()).toEqual(b);
  });

  it("applies a refresh that is still current", async () => {
    saveSession(session("a", 1, PAST));
    const requests: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push(String((init?.headers as Record<string, string> | undefined)?.Authorization ?? ""));
        if (isRefresh(input)) {
          return json(200, {
            userId: "a",
            accessToken: "a-access-2",
            accessTokenExpiresAt: FUTURE,
            refreshToken: "a-refresh-2",
          });
        }
        return json(200, { ok: true });
      }),
    );

    await expect(apiFetch<{ ok: boolean }>("/v1/me")).resolves.toEqual({ ok: true });
    expect(loadSession()).toEqual(session("a", 2, FUTURE));
    expect(requests.at(-1)).toBe("Bearer a-access-2");
  });
});
