// Server-synced now (GET/PUT /v1/vocab/starred) — lib/starredLexemeStore.ts
// was the local-only placeholder before that backend existed, and is used
// here ONLY for a one-time migration of whatever it holds for `courseCode`
// (the sole course a caller of this hook ever had a local placeholder for),
// flushed through the batch endpoint and then cleared. After that, the
// server plus this hook's own react-query cache are the sole source of
// truth — see PUT /v1/vocab/starred/batch's doc for why a diff-based
// reconcile, not a replay of individual toggles, is the right shape for a
// migration (or any future offline-buffered catch-up write).
import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { batchSetStarred, getStarredVocab, setStarred } from "../api/vocab";
import { clearStarredLexemes, loadStarredLexemes } from "../lib/starredLexemeStore";
import { useAuth } from "../auth/useAuth";
import type { StarredVocabResponse } from "../types/api";

const QUERY_KEY = ["vocab", "starred"];

export interface StarredLexemes {
  isStarred: (tag: string) => boolean;
  /** Fires a direct, optimistic mutation — the star fills immediately, before the round trip, and rolls back on failure. Not routed through the offline queue: unlike a graded session, a star is trivially recoverable by tapping it again. */
  toggle: (tag: string) => void;
}

export function useStarredLexemes(courseCode: string | null | undefined): StarredLexemes {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const migrated = useRef(false);

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getStarredVocab,
  });

  const setMutation = useMutation({
    mutationFn: setStarred,
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<StarredVocabResponse>(QUERY_KEY);
      queryClient.setQueryData<StarredVocabResponse>(QUERY_KEY, (current) => {
        const tags = new Set(current?.tags ?? []);
        if (request.starred) tags.add(request.tag);
        else tags.delete(request.tag);
        return { tags: [...tags] };
      });
      return { previous };
    },
    onError: (_error, _request, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous);
    },
    onSuccess: (response) => queryClient.setQueryData(QUERY_KEY, response),
  });

  const migrationMutation = useMutation({ mutationFn: batchSetStarred });

  // Runs at most once per session (the ref, not query state, guards it — a
  // background refetch of `query` must never re-trigger this): once both a
  // course and the server's own list are known, diff the local placeholder
  // against what the server already has and flush only what's missing.
  useEffect(() => {
    if (migrated.current || !userId || !courseCode || !query.data) return;
    migrated.current = true;

    const local = loadStarredLexemes(userId, courseCode);
    if (local.size === 0) return;

    const alreadyOnServer = new Set(query.data.tags);
    const toMigrate = [...local].filter((tag) => !alreadyOnServer.has(tag));

    if (toMigrate.length === 0) {
      clearStarredLexemes(userId, courseCode);
      return;
    }

    migrationMutation.mutate(
      { star: toMigrate, unstar: [] },
      {
        onSuccess: (response) => {
          queryClient.setQueryData(QUERY_KEY, response);
          clearStarredLexemes(userId, courseCode);
        },
      },
    );
    // migrationMutation/queryClient are stable across renders; userId/
    // courseCode/query.data are the real trigger, and the ref above is what
    // actually enforces "at most once" regardless of how those change later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, courseCode, query.data]);

  const tags = new Set(query.data?.tags ?? []);

  return {
    isStarred: (tag) => tags.has(tag),
    toggle: (tag) => setMutation.mutate({ tag, starred: !tags.has(tag) }),
  };
}
