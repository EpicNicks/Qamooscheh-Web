import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as friendsApi from "../api/friends";
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
