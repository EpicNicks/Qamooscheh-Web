import { describe, expect, it } from "vitest";
import { AVATAR_COLOR_TOKENS, avatarColorToken, avatarInitial, friendsSinceLabel, leagueRowOrNull } from "./friendProfile";

describe("leagueRowOrNull", () => {
  it("shows the row only when the friend has a league standing", () => {
    expect(leagueRowOrNull({ league: { rank: 2, points: 40 } })).toEqual({ rank: 2, points: 40 });
    expect(leagueRowOrNull({ league: null })).toBeNull();
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
    expect(friendsSinceLabel("2026-03-15T12:00:00Z")).toMatch(/2026$/);
    expect(friendsSinceLabel("nope")).toBeNull();
  });
});
