// Submits graded answers that may span several lessons — one SubmittedSession
// per skill they came from, since grading an item under a skill it doesn't
// belong to would corrupt that skill's card state (API_SPEC.md §2.3). The
// saved-words remix uses this; useLessonEngine's finishLesson does the same
// grouping inline, alongside its lesson-completion bookkeeping.
import { submitSessions } from "../api/sessionSubmit";
import { mergeCardStates } from "./cardStateStore";
import { enqueue as enqueueOffline } from "./offlineQueue";
import type { SubmittedItem, SubmittedSession } from "../types/api";

export interface RecordedAnswer {
  unitKey: string | null;
  skillKey: string;
  item: SubmittedItem;
}

/**
 * "saved" when every session landed, "queued" when any had to wait for the
 * offline queue (lib/offlineQueue.ts — it syncs on the next flush), and
 * "rejected" when the server refused one outright.
 */
export type SubmitOutcome = "saved" | "queued" | "rejected";

export async function submitRecordedAnswers(params: {
  userId: string;
  courseCode: string;
  courseVersion: number;
  answers: readonly RecordedAnswer[];
}): Promise<SubmitOutcome> {
  const { userId, courseCode, courseVersion, answers } = params;
  const occurredAt = new Date().toISOString();
  const bySkill = new Map<string, SubmittedSession>();
  for (const answer of answers) {
    const key = `${answer.unitKey ?? "_"}/${answer.skillKey}`;
    let session = bySkill.get(key);
    if (!session) {
      session = {
        submissionId: crypto.randomUUID(),
        unitKey: answer.unitKey,
        skillKey: answer.skillKey,
        courseCode,
        courseVersion,
        occurredAt,
        // Informational only (the server derives completion itself), and a
        // remix never covers a whole lesson.
        completed: false,
        items: [],
      };
      bySkill.set(key, session);
    }
    session.items.push(answer.item);
  }

  const sessions = [...bySkill.values()];
  if (sessions.length === 0) return "saved";

  try {
    const response = await submitSessions(sessions);
    for (const result of response.sessions) {
      if (result.outcome !== "Rejected") mergeCardStates(userId, result.cards);
    }
    // A session the response doesn't mention wasn't refused, just not
    // answered for — queue it like a network failure.
    const answered = new Set(response.sessions.map((s) => s.submissionId));
    const missing = sessions.filter((s) => !answered.has(s.submissionId));
    for (const session of missing) enqueueOffline(userId, session);

    if (response.sessions.some((s) => s.outcome === "Rejected")) return "rejected";
    return missing.length > 0 ? "queued" : "saved";
  } catch {
    for (const session of sessions) enqueueOffline(userId, session);
    return "queued";
  }
}
