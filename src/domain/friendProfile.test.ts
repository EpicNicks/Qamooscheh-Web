import { describe, expect, it } from "vitest";
import { AVATAR_COLOR_TOKENS, avatarColorToken, avatarInitial, friendsSinceLabel, resolveFriendProfile } from "./friendProfile";
import type { CurrentLeagueResponse, FriendRefResponse } from "../types/api";

const friends: FriendRefResponse[] = [
  { userId: "a", displayName: "Sara", username: "sara_k", since: "2026-03-05T00:00:00Z" },
  { userId: "b", displayName: null, username: null, since: "2026-04-01T00:00:00Z" },
];
const league: CurrentLeagueResponse = {
  tier: 1,
  periodEndsAt: "2026-10-20T00:00:00Z",
  standings: [
    { userId: "x", displayName: "X", points: 90 },
    { userId: "a", displayName: "Sara", points: 40 },
  ],
};

describe("resolveFriendProfile", () => {
  it("is unknown for a missing or non-friend id", () => {
    expect(resolveFriendProfile(undefined, friends, league)).toEqual({ status: "unknown" });
    expect(resolveFriendProfile("zzz", friends, league)).toEqual({ status: "unknown" });
  });
  it("finds the friend with rank and points when in the league", () => {
    expect(resolveFriendProfile("a", friends, league)).toEqual({
      status: "found",
      friend: friends[0],
      league: { rank: 2, points: 40 },
    });
  });
  it("has no league card when the friend is not in standings or there is no league", () => {
    expect(resolveFriendProfile("b", friends, league)).toMatchObject({ status: "found", league: null });
    expect(resolveFriendProfile("a", friends, undefined)).toMatchObject({ status: "found", league: null });
  });
});

describe("avatar", () => {
  it("picks a stable theme token per userId", () => {
    expect(avatarColorToken("abc")).toBe(avatarColorToken("abc"));
    expect(AVATAR_COLOR_TOKENS).toContain(avatarColorToken("another-id"));
  });
  it("uses the first character, upper-cased, or ? when unnamed", () => {
    expect(avatarInitial("sara")).toBe("S");
    expect(avatarInitial(null)).toBe("?");
    expect(avatarInitial("  ")).toBe("?");
  });
});

describe("friendsSinceLabel", () => {
  it("formats month and year, null when unparsable", () => {
    expect(friendsSinceLabel("2026-03-15T12:00:00Z")).toMatch(/^Friends since .*2026$/);
    expect(friendsSinceLabel("nope")).toBeNull();
  });
});
