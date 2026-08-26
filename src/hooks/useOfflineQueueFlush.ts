// Flushes lib/offlineQueue.ts's queued sessions once connectivity is back —
// the client-side half of API_SPEC.md §7/§8's offline story. Mounted once,
// for the whole authenticated app (components/layout/AppShell.tsx), not
// per-page: a queued session from an earlier offline lesson should sync as
// soon as the app is online again, regardless of which screen is open.
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { submitSessions } from "../api/sessionSubmit";
import { OFFLINE_QUEUE_CHANGED_EVENT, loadQueue, removeFromQueue } from "../lib/offlineQueue";
import { mergeCardStates } from "../lib/cardStateStore";
import { useAuth } from "../auth/useAuth";

export function useOfflineQueueFlush() {
  const { userId, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const [isFlushing, setIsFlushing] = useState(false);
  const flushingRef = useRef(false);

  function refreshPendingCount(currentUserId: string) {
    setPendingCount(loadQueue(currentUserId).length);
  }

  async function flush(currentUserId: string) {
    if (flushingRef.current) return;
    const queued = loadQueue(currentUserId);
    if (queued.length === 0) {
      setPendingCount(0);
      return;
    }

    flushingRef.current = true;
    setIsFlushing(true);
    try {
      const response = await submitSessions(queued);
      // Every session the server actually settled — Processed,
      // AlreadyProcessed (a prior delivery already landed), or Rejected
      // (unrecoverable, e.g. a stale course version) — is done retrying;
      // only a network/server failure on the request itself leaves the
      // queue untouched for the next trigger.
      const settledIds = response.sessions.map((s) => s.submissionId);
      for (const s of response.sessions) {
        if (s.cards.length > 0) mergeCardStates(currentUserId, s.cards);
      }
      removeFromQueue(currentUserId, settledIds);
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      queryClient.invalidateQueries({ queryKey: ["sessionPlan"] });
      queryClient.invalidateQueries({ queryKey: ["league", "current"] });
    } catch {
      // Still offline, or the server is unreachable — leave the queue as is
      // and wait for the next 'online' event or queue-changed nudge.
    } finally {
      flushingRef.current = false;
      setIsFlushing(false);
      refreshPendingCount(currentUserId);
    }
  }

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    const uid = userId; // narrow once, for the closures below

    refreshPendingCount(uid);
    if (navigator.onLine) void flush(uid);

    function handleWake() {
      void flush(uid);
    }
    window.addEventListener("online", handleWake);
    window.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, handleWake);
    return () => {
      window.removeEventListener("online", handleWake);
      window.removeEventListener(OFFLINE_QUEUE_CHANGED_EVENT, handleWake);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userId]);

  return { pendingCount, isFlushing };
}
