import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as friendsApi from "../api/friends";

export function useFriends() {
  return useQuery({ queryKey: ["friends"], queryFn: friendsApi.getFriends });
}

export function usePendingFriendRequests() {
  return useQuery({ queryKey: ["friends", "requests"], queryFn: friendsApi.getPendingRequests });
}

export function useFriendSearch(query: string) {
  return useQuery({
    queryKey: ["friends", "search", query],
    queryFn: () => friendsApi.searchUsers(query),
    // FriendsController's own contract: a short/empty query is a normal
    // empty-list answer, not something worth a request for every keystroke
    // before the user has typed anything meaningful.
    enabled: query.trim().length > 0,
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
