// Friend profile page helpers: pure formatting over GET /v1/friends/{id}/stats.
import type { FriendStatsResponse } from "../types/api";

/** The league row exists only when the friend is in the caller's current cohort. */
export function leagueRowOrNull(stats: Pick<FriendStatsResponse, "league">): { rank: number; points: number } | null {
  return stats.league ?? null;
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

/** "March 2026"; null when the timestamp doesn't parse. */
export function friendsSinceLabel(since: string): string | null {
  const date = new Date(since);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
