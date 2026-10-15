import { QueryClient } from "@tanstack/query-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../api/httpClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/httpClient")>()),
  apiFetch: vi.fn(),
}));

import { ApiError, apiFetch } from "../api/httpClient";
import * as friendsApi from "../api/friends";
import { friendStatsKey, shouldRetryFriendStats, unfriendMutationOptions } from "./useFriends";

const apiFetchMock = vi.mocked(apiFetch);

beforeEach(() => apiFetchMock.mockReset());

describe("friend stats and unfriend api", () => {
  it("reads stats from the escaped per-friend route", async () => {
    apiFetchMock.mockResolvedValue({ userId: "a/b" });
    await friendsApi.getFriendStats("a/b");
    expect(apiFetchMock).toHaveBeenCalledWith("/v1/friends/a%2Fb/stats");
  });
  it("unfriends with DELETE", async () => {
    apiFetchMock.mockResolvedValue(undefined);
    await friendsApi.unfriend("a");
    expect(apiFetchMock).toHaveBeenCalledWith("/v1/friends/a", { method: "DELETE" });
  });
});

describe("unfriend mutation", () => {
  it("refreshes the friends list and drops the stats entry on success", async () => {
    apiFetchMock.mockResolvedValue(undefined);
    const client = new QueryClient();
    client.setQueryData(["friends"], [{ userId: "a" }]);
    client.setQueryData(friendStatsKey("a"), { userId: "a" });
    const invalidate = vi.spyOn(client, "invalidateQueries");

    await client.getMutationCache().build(client, unfriendMutationOptions(client)).execute("a");

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["friends"] });
    expect(client.getQueryData(friendStatsKey("a"))).toBeUndefined();
  });
});

describe("shouldRetryFriendStats", () => {
  it("does not retry 404 or 429, retries other failures twice", () => {
    expect(shouldRetryFriendStats(0, new ApiError(404, null))).toBe(false);
    expect(shouldRetryFriendStats(0, new ApiError(429, null))).toBe(false);
    expect(shouldRetryFriendStats(0, new ApiError(500, null))).toBe(true);
    expect(shouldRetryFriendStats(2, new TypeError("network"))).toBe(false);
  });
});
