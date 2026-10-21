// Flushes lib/offlineQueue.ts's queued sessions once connectivity is back —
// the client-side half of API_SPEC.md §7/§8's offline story. Mounted once,
// for the whole authenticated app (components/layout/AppShell.tsx), not
// per-page: a queued session from an earlier offline lesson should sync as
// soon as the app is online again, regardless of which screen is open.
//
// Each queued session now names its own course (SubmittedSession.courseCode)
// and the server grades it against that course explicitly, so flushing
// doesn't need to know or wait for whatever course happens to be active.
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { submitSessions } from "../api/sessionSubmit";
import { OFFLINE_QUEUE_CHANGED_EVENT, hasUnknownSubmissions, loadQueue, removeFromQueue, settleFlush } from "../lib/offlineQueue";
import {
  SYNC_REJECTIONS_CHANGED_EVENT,
  addRejections,
  clearRejections,
  loadRejections,
  type SyncRejection,
} from "../lib/syncRejections";
import { mergeCardStates } from "../lib/cardStateStore";
import { useAuth } from "../auth/useAuth";

export function useOfflineQueueFlush() {
  const { userId, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const [isFlushing, setIsFlushing] = useState(false);
  const [rejections, setRejections] = useState<SyncRejection[]>([]);
  const flushingRef = useRef(false);
  // Set when a flush is requested while one is already in flight — that
  // request's trigger (an online event, a course switch, a fresh enqueue)
  // is real and must not be silently dropped just because it lost the race.
  const rerunRef = useRef(false);
  // Who is signed in right now, as the effect below last saw it. A flush is
  // async, so it re-checks this after every await instead of trusting the
  // userId it started with.
  const activeUserRef = useRef<string | null>(null);

  function refreshPendingCount(currentUserId: string) {
    setPendingCount(loadQueue(currentUserId).length);
  }

  async function flush(currentUserId: string) {
    if (activeUserRef.current !== currentUserId) return;
    if (flushingRef.current) {
      rerunRef.current = true;
      return;
    }
    const queued = loadQueue(currentUserId);
    setPendingCount(queued.length);
    if (queued.length === 0) return;

    // Anything enqueued after this snapshot arrived mid-flush; its
    // queue-changed event was dropped by the guard above, so the `finally`
    // block below drains it in another pass rather than leaving it for an
    // unrelated trigger (an 'online' event, the next enqueue, or a remount).
    const knownIds = new Set(queued.map((session) => session.submissionId));

    flushingRef.current = true;
    setIsFlushing(true);
    let delivered = false;
    try {
      // Sent as the account that queued it: if someone else signs in first,
      // this throws instead of going out under their token.
      const response = await submitSessions(queued, { asUserId: currentUserId });
      delivered = true;
      // The account changed while the request was in flight. Nothing here may
      // touch the new account's local data; the old account's queue is left
      // alone and a replay answers AlreadyProcessed next time it signs in.
      if (activeUserRef.current !== currentUserId) return;
      // Every session the server actually settled — Processed,
      // AlreadyProcessed (a prior delivery already landed), or Rejected
      // (unrecoverable, e.g. a stale course version) — is done retrying;
      // only a network/server failure on the request itself leaves the
      // queue untouched for the next trigger. A rejection is kept for the
      // learner to see before the session leaves the queue.
      const { settledIds, rejections: refused, cards } = settleFlush(queued, response);
      for (const batch of cards) mergeCardStates(currentUserId, batch);
      addRejections(currentUserId, refused);
      if (settledIds.length > 0) removeFromQueue(currentUserId, settledIds);
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      queryClient.invalidateQueries({ queryKey: ["sessionPlan"] });
      queryClient.invalidateQueries({ queryKey: ["lessonsCompleted"] });
      queryClient.invalidateQueries({ queryKey: ["league", "current"] });
      // Each flushed session lands on its own occurredAt day, so a flush can
      // fill in yesterday as well as today — the streak has to be re-read.
      queryClient.invalidateQueries({ queryKey: ["streak"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    } catch {
      // Still offline, the server is unreachable, or the account changed
      // before sending — leave the queue as is and wait for the next
      // 'online' event or queue-changed nudge.
    } finally {
      flushingRef.current = false;
      setIsFlushing(false);
      const activeUserId = activeUserRef.current;
      if (activeUserId !== currentUserId) {
        // Signed out or switched mid-flush: this pass's trigger belonged to
        // the old account. Run once for whoever is signed in now, whose own
        // trigger the in-flight guard may have swallowed.
        rerunRef.current = false;
        if (activeUserId && navigator.onLine) void flush(activeUserId);
      } else {
        const remaining = loadQueue(currentUserId);
        setPendingCount(remaining.length);
        // Rerun if something explicitly asked for a flush while this one was
        // busy, or — for a pass that actually reached the server — if a
        // genuinely new entry showed up mid-flush. Comparing against the ids
        // this pass knew about ignores our own removeFromQueue event, so this
        // can't spin; a failed pass still only retries because something asked
        // it to, never blindly.
        const shouldRerun = rerunRef.current || (delivered && hasUnknownSubmissions(remaining, knownIds));
        rerunRef.current = false;
        if (shouldRerun) void flush(currentUserId);
      }
    }
  }

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    const uid = userId; // narrow once, for the closures below
    activeUserRef.current = uid;

    // Reading localStorage and kicking off a network flush is synchronizing
    // with external systems (the queue, the network), which is exactly what
    // effects are for — not a derivable render value.
    // eslint-disable-next-line react/set-state-in-effect
    refreshPendingCount(uid);
    // eslint-disable-next-line react/set-state-in-effect
    setRejections(loadRejections(uid));
    if (navigator.onLine) void flush(uid);

    function handleWake() {
      void flush(uid);
    }
    function handleRejectionsChanged() {
      setRejections(loadRejections(uid));
    }
    window.addEventListener("online", handleWake);
    window.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, handleWake);
    window.addEventListener(SYNC_REJECTIONS_CHANGED_EVENT, handleRejectionsChanged);
    return () => {
      activeUserRef.current = null;
      setRejections([]);
      window.removeEventListener("online", handleWake);
      window.removeEventListener(OFFLINE_QUEUE_CHANGED_EVENT, handleWake);
      window.removeEventListener(SYNC_REJECTIONS_CHANGED_EVENT, handleRejectionsChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flush is stable across the lifetime of this effect's concerns; including it would re-run on every render.
  }, [isAuthenticated, userId]);

  function dismissRejections() {
    if (userId) clearRejections(userId);
  }

  return { pendingCount, isFlushing, rejections, dismissRejections };
}
