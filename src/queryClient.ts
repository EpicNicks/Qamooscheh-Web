import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Content artifacts and most session state are immutable-per-version
      // or explicitly re-fetched after a mutation — no need for aggressive
      // background refetching by default.
      staleTime: 30_000,
      retry: 1,
    },
  },
});
