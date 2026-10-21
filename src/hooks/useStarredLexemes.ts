// Server-synced now (GET/PUT /v1/vocab/starred) — lib/starredLexemeStore.ts
// was the local-only placeholder before that backend existed, and is used
// here ONLY for a one-time migration of whatever it holds for `courseCode`
// (the sole course a caller of this hook ever had a local placeholder for),
// flushed through the batch endpoint and then cleared. After that, the
// server plus this hook's own react-query cache are the sole source of
// truth — see PUT /v1/vocab/starred/batch's doc for why a diff-based
// reconcile, not a replay of individual toggles, is the right shape for a
// migration (or any future offline-buffered catch-up write).
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { batchSetStarred, getStarredVocab, setStarred } from "../api/vocab";
import { createStarredWriter, type StarredWriter } from "../lib/starredWrites";
import { queryClient as appQueryClient } from "../queryClient";
import { clearStarredLexemes, loadStarredLexemes } from "../lib/starredLexemeStore";
import { useAuth } from "../auth/useAuth";
import { ApiError } from "../api/httpClient";
import type { StarredVocabResponse } from "../types/api";

const QUERY_KEY = ["vocab", "starred"];

// One writer per account, shared by every component using this hook, so star
// and unstar requests are serialized app-wide (lib/starredWrites.ts).
const writers = new Map<string, StarredWriter>();

function writerFor(userId: string): StarredWriter {
  let writer = writers.get(userId);
  if (!writer) {
    writer = createStarredWriter({
      send: (request) => setStarred(request, { asUserId: userId }),
      onList: (tags, reply) =>
        appQueryClient.setQueryData<StarredVocabResponse>(QUERY_KEY, (current) => ({
          tags,
          limit: reply?.limit ?? current?.limit ?? 0,
          refused: [],
        })),
      limitMessageFor: (error) => (error instanceof ApiError && error.status === 409 ? error.message : null),
    });
    writers.set(userId, writer);
  }
  return writer;
}

export interface StarredLexemes {
  /** Every saved tag, in any course, most recently saved first. */
  tags: readonly string[];
  /** How many the learner's plan can save, across every course (null until loaded). */
  limit: number | null;
  isStarred: (tag: string) => boolean;
  /** Fires a direct, optimistic mutation — the star fills immediately, before the round trip, and rolls back on failure. Not routed through the offline queue: unlike a graded session, a star is trivially recoverable by tapping it again. */
  toggle: (tag: string) => void;
  /** Set when the last save was refused because the list is full — the server's own wording. Cleared by the next successful change. */
  limitMessage: string | null;
}

export function useStarredLexemes(courseCode: string | null | undefined): StarredLexemes {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const migrated = useRef(false);

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getStarredVocab,
  });

  const writer = userId ? writerFor(userId) : null;
  const limitMessage = useSyncExternalStore(
    (listener) => writer?.subscribe(listener) ?? (() => undefined),
    () => writer?.limitMessage ?? null,
  );

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

  const tagList = query.data?.tags ?? [];
  const tags = new Set(tagList);

  return {
    tags: tagList,
    limit: query.data?.limit ?? null,
    isStarred: (tag) => tags.has(tag),
    toggle: (tag) => {
      if (!writer) return;
      const shown = queryClient.getQueryData<StarredVocabResponse>(QUERY_KEY);
      const next = writer.set(tag, !tags.has(tag), shown?.tags ?? []);
      queryClient.setQueryData<StarredVocabResponse>(QUERY_KEY, { tags: next, limit: shown?.limit ?? 0, refused: [] });
    },
    limitMessage,
  };
}
