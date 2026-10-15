// v1/friends — FriendsController.cs (API_SPEC.md §2.6).
import { apiFetch } from "./httpClient";
import type { FriendRefResponse, FriendStatsResponse, FriendRequestResponse, UserSearchResultResponse } from "../types/api";

export function getFriends(): Promise<FriendRefResponse[]> {
  return apiFetch<FriendRefResponse[]>("/v1/friends");
}

export function getPendingRequests(): Promise<FriendRefResponse[]> {
  return apiFetch<FriendRefResponse[]>("/v1/friends/requests");
}

/** Exact, case-insensitive username match; zero or one hit. Anything not a well-formed username is `[]`, never a 400. */
export function searchUsers(query: string): Promise<UserSearchResultResponse[]> {
  return apiFetch<UserSearchResultResponse[]>(`/v1/friends/search?query=${encodeURIComponent(query)}`);
}

export function requestFriendship(otherUserId: string): Promise<FriendRequestResponse> {
  return apiFetch<FriendRequestResponse>(`/v1/friends/${encodeURIComponent(otherUserId)}`, { method: "POST" });
}

export function acceptFriendRequest(otherUserId: string): Promise<void> {
  return apiFetch<void>(`/v1/friends/${encodeURIComponent(otherUserId)}/accept`, { method: "POST" });
}

export function declineFriendRequest(otherUserId: string): Promise<void> {
  return apiFetch<void>(`/v1/friends/${encodeURIComponent(otherUserId)}/decline`, { method: "POST" });
}

/** Accepted friends only; anyone else (stranger, pending, blocked, own id) is the same 404. */
export function getFriendStats(userId: string): Promise<FriendStatsResponse> {
  return apiFetch<FriendStatsResponse>(`/v1/friends/${encodeURIComponent(userId)}/stats`);
}

/** Idempotent: 204 whether or not there was a friendship. Not a block. */
export function unfriend(userId: string): Promise<void> {
  return apiFetch<void>(`/v1/friends/${encodeURIComponent(userId)}`, { method: "DELETE" });
}
