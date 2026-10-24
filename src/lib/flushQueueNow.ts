// Sends the offline queue right now and waits for the answer — for the one
// caller that cannot proceed on a promise to sync later (Stow, API_SPEC.md
// §2.18: the server judges the cursor and the failed attempt, so a queued
// result has to land first). hooks/useOfflineQueueFlush.ts keeps the
// background flush; both are safe together, since the server answers a repeat
// submission with AlreadyProcessed.
import type { QueryClient } from "@tanstack/react-query";
import { submitSessions } from "../api/sessionSubmit";
import { PAGE_ID, flushable, loadQueue, removeFromQueue, settleFlush } from "./offlineQueue";
import { addRejections } from "./syncRejections";
import { mergeCardStates } from "./cardStateStore";
import { applyStowCleared } from "./stowageCache";

/** Resolves once nothing this page can send is left in the queue; rejects if the send fails. */
export async function flushQueueNow(userId: string, queryClient: QueryClient): Promise<void> {
  const queued = flushable(loadQueue(userId), PAGE_ID, Date.now());
  if (queued.length === 0) return;

  const response = await submitSessions(queued, { asUserId: userId });
  const { settledIds, rejections, cards } = settleFlush(queued, response);
  for (const batch of cards) mergeCardStates(userId, batch);
  addRejections(userId, rejections);
  if (settledIds.length > 0) removeFromQueue(userId, settledIds);
  applyStowCleared(queryClient, response.sessions);
  for (const key of ["bootstrap", "sessionPlan", "lessonsCompleted", "streak", "activity"]) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}
