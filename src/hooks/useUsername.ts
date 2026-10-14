import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getUsername, setUsername } from "../api/username";

export function useUsername() {
  return useQuery({ queryKey: ["username"], queryFn: getUsername });
}

export function useSetUsername() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (username: string) => setUsername(username),
    onSuccess: (next) => {
      queryClient.setQueryData(["username"], next);
    },
  });
}
