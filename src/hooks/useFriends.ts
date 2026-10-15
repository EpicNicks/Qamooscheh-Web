import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import * as friendsApi from "../api/friends";
import { ApiError } from "../api/httpClient";
import { usernameFormatProblem } from "../domain/username";

export function useFriends() {
  return useQuery({ queryKey: ["friends"], queryFn: friendsApi.getFriends });
}

export function usePendingFriendRequests() {
  return useQuery({ queryKey: ["friends", "requests"], queryFn: friendsApi.getPendingRequests });
}

/** `username` must already be normalized (domain/username.ts); a malformed one is not sent. */
export function useFriendSearch(username: string) {
  return useQuery({
    queryKey: ["friends", "search", username],
    queryFn: () => friendsApi.searchUsers(username),
    // The backend answers a malformed handle with 200 [], but lookups share a
    // rate-limited budget (429), so a half-typed box shouldn't spend it.
    enabled: usernameFormatProblem(username) === null,
    retry: false,
  });
}

function useInvalidateFriends() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["friends"] });
  };
}

export function useRequestFriendship() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: (otherUserId: string) => friendsApi.requestFriendship(otherUserId),
    onSuccess: invalidate,
  });
}

export function useAcceptFriendRequest() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: (otherUserId: string) => friendsApi.acceptFriendRequest(otherUserId),
    onSuccess: invalidate,
  });
}

export function useDeclineFriendRequest() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: (otherUserId: string) => friendsApi.declineFriendRequest(otherUserId),
    onSuccess: invalidate,
  });
}

export const friendStatsKey = (userId: string) => ["friendStats", userId] as const;

/** A 4xx (404 not friends, 429 over budget) is an answer, not a blip: surface it instead of retrying. */
export function shouldRetryFriendStats(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

export function useFriendStats(userId: string | undefined) {
  return useQuery({
    queryKey: friendStatsKey(userId ?? ""),
    queryFn: () => friendsApi.getFriendStats(userId as string),
    enabled: !!userId,
    retry: shouldRetryFriendStats,
  });
}

/** Separate from the hook so it can be exercised without a React renderer. */
export function unfriendMutationOptions(queryClient: QueryClient) {
  return {
    mutationFn: (userId: string) => friendsApi.unfriend(userId),
    onSuccess: (_data: void, userId: string) => {
      // Drop the stats entry rather than refetch it: it would only 404 now.
      queryClient.removeQueries({ queryKey: friendStatsKey(userId) });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  };
}

export function useUnfriend() {
  return useMutation(unfriendMutationOptions(useQueryClient()));
}
