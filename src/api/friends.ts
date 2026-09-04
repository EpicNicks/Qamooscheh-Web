// v1/friends — FriendsController.cs (API_SPEC.md §2.6).
import { apiFetch } from "./httpClient";
import type { FriendRefResponse, FriendRequestResponse, UserSearchResultResponse } from "../types/api";

export function getFriends(): Promise<FriendRefResponse[]> {
  return apiFetch<FriendRefResponse[]>("/v1/friends");
}

export function getPendingRequests(): Promise<FriendRefResponse[]> {
  return apiFetch<FriendRefResponse[]>("/v1/friends/requests");
}

/** Empty/short queries return `[]`, never a 400 — safe to call per keystroke. */
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
