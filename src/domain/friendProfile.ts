// Friend profile page data: only what GET /v1/friends and the learner's own
// league standings already return. There is no friend-stats endpoint.
import type { CurrentLeagueResponse, FriendRefResponse } from "../types/api";

export interface FriendLeagueStanding {
  rank: number;
  points: number;
}

export type FriendProfileResolution =
  | { status: "unknown" }
  | { status: "found"; friend: FriendRefResponse; league: FriendLeagueStanding | null };

/** `league` is null when the learner has none; rank is the 1-based standings position, as on LeaguesPage. */
export function resolveFriendProfile(
  userId: string | undefined,
  friends: readonly FriendRefResponse[],
  league: CurrentLeagueResponse | null | undefined,
): FriendProfileResolution {
  const friend = userId ? friends.find((f) => f.userId === userId) : undefined;
  if (!friend) return { status: "unknown" };
  const index = league?.standings.findIndex((row) => row.userId === friend.userId) ?? -1;
  if (!league || index < 0) return { status: "found", friend, league: null };
  return { status: "found", friend, league: { rank: index + 1, points: league.standings[index].points } };
}

/** Existing theme tokens only, so every theme gets its own avatar palette. */
export const AVATAR_COLOR_TOKENS = [
  "--color-primary",
  "--color-current",
  "--color-placement",
  "--color-deepdive",
  "--color-info",
  "--color-streak",
] as const;

/** Stable per userId: the same friend always gets the same colour. */
export function avatarColorToken(userId: string): (typeof AVATAR_COLOR_TOKENS)[number] {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return AVATAR_COLOR_TOKENS[hash % AVATAR_COLOR_TOKENS.length];
}

export function avatarInitial(displayName: string | null): string {
  const first = Array.from((displayName ?? "").trim())[0];
  return first ? first.toUpperCase() : "?";
}

/** "Friends since March 2026"; null when the timestamp doesn't parse. */
export function friendsSinceLabel(since: string): string | null {
  const date = new Date(since);
  if (Number.isNaN(date.getTime())) return null;
  return `Friends since ${date.toLocaleDateString(undefined, { month: "long", year: "numeric" })}`;
}
