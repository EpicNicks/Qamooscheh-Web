// Taking one story/conversation/song skill, start to finish. A deliberately
// simpler sibling of useLessonEngine.ts, and simpler for reasons that come
// straight from what these skills ARE rather than from cutting corners:
//
//   * No session plan. GET /v1/sessions/next only ever plans the learner's
//     own cursor, and these skills sit outside that sequence entirely — so
//     the skill is named by the route, not negotiated with the server.
//   * No due-tag filtering. A lesson serves the subset of exercises whose
//     lexemes are due; a chapter is read straight through, in authored order,
//     or it isn't a story any more.
//   * No retry queue. §2.5's requeue-on-wrong loop exists to drill a lesson's
//     lexemes to competence. A first read-through has nothing to drill yet.
//   * resolveExerciseType(exercise, null) — every exercise treated as "new",
//     which is exactly right for a first read: composites serve as word_bank.
//
// What it does share with useLessonEngine, and shares by calling the same
// code rather than by resembling it: instant feedback (domain/answerFeedback),
// the SubmittedItem accumulation shape, and the POST /v1/sessions/submit call
// with its local card merge and offline-queue fallback. §2.3 doesn't restrict
// submission to standard-category skills — completing one of these is logged
// to skill_completion and simply never moves the cursor.
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBootstrap } from "./useBootstrap";
import { useSkillArtifactsForRefs } from "./useCourseContent";
import { submitSessions } from "../api/sessionSubmit";
import { useAuth } from "../auth/useAuth";
import { mergeCardStates } from "../lib/cardStateStore";
import { enqueue as enqueueOffline } from "../lib/offlineQueue";
import { checkAnswer } from "../domain/answerFeedback";
import { resolveExerciseType } from "../domain/exerciseResolution";
import type { SubmittedItem, SubmittedSession, SubmittedSessionResponse } from "../types/api";
import type { ExerciseArtifact } from "../types/content";
import type { ExerciseType } from "../domain/enums";

export interface WalkthroughExerciseInstance {
  key: string;
  ordinal: number;
  exercise: ExerciseArtifact;
  renderType: ExerciseType;
}

export type WalkthroughStatus = "loading" | "empty" | "ready" | "submitting" | "done" | "error";

export interface WalkthroughAnswerResult {
  correct: boolean;
  note: string | null;
}

export function useSkillWalkthrough(unitKey: string, skillKey: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const bootstrap = useBootstrap();
  const course = bootstrap.data?.course ?? null;

  const refs = [{ unitKey, skillKey }];
  const { skills, isLoading: skillLoading, isError: skillError } = useSkillArtifactsForRefs(course, refs);
  const artifact = skills.get(`${unitKey}/${skillKey}`) ?? null;

  // Plain derivation rather than useMemo: it's one map over a handful of
  // exercises, and it's read once, at the seeding check below.
  const instances: WalkthroughExerciseInstance[] = artifact
    ? artifact.exercises.map((exercise, ordinal) => ({
        key: `${unitKey}/${skillKey}/${ordinal}`,
        ordinal,
        exercise,
        renderType: resolveExerciseType(exercise, null),
      }))
    : [];

  const [queue, setQueue] = useState<WalkthroughExerciseInstance[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [items, setItems] = useState<SubmittedItem[]>([]);
  const [status, setStatus] = useState<WalkthroughStatus>("loading");
  const [result, setResult] = useState<SubmittedSessionResponse | null>(null);

  // Seeded lazily, exactly as useLessonEngine does and for the same reason:
  // re-seeding on a background refetch would discard answers already given.
  if (queue === null && artifact) {
    setQueue(instances);
    setTotalCount(instances.length);
  }

  const current = queue && queue.length > 0 ? queue[0] : null;

  async function submitAnswer(submittedText: string, opts?: { usedHint?: boolean }): Promise<WalkthroughAnswerResult> {
    if (!current || !queue) return { correct: false, note: null };

    const feedback = checkAnswer(course?.code, current.exercise, submittedText);

    const newItems = current.exercise.tags.map(
      (lexemeTag): SubmittedItem => ({
        exerciseOrdinal: current.ordinal,
        lexemeTag,
        exerciseType: current.renderType,
        scriptMode: current.exercise.scriptMode,
        submittedText,
        usedHint: opts?.usedHint ?? false,
        latencyMs: null,
        attempt: 1,
      }),
    );
    setItems((prev) => [...prev, ...newItems]);

    // Always advance: a chapter reads forward whether or not the learner got
    // the line exactly right. The server still grades every item.
    const rest = queue.slice(1);
    setQueue(rest);

    if (rest.length === 0) await finish([...items, ...newItems]);

    return { correct: feedback.verdict !== "incorrect", note: feedback.note };
  }

  async function finish(finalItems: SubmittedItem[]) {
    if (!course) return;
    setStatus("submitting");

    const session: SubmittedSession = {
      submissionId: crypto.randomUUID(),
      unitKey,
      skillKey,
      // The learner's pinned course version — the only one §2.3 accepts, and
      // the version these exercises were in fact fetched from.
      courseVersion: course.version,
      occurredAt: new Date().toISOString(),
      completed: true,
      items: finalItems,
    };

    try {
      const response = await submitSessions([session]);
      const sessionResult = response.sessions[0];
      setResult(sessionResult ?? null);
      if (userId && sessionResult) mergeCardStates(userId, sessionResult.cards);
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      setStatus("done");
    } catch {
      if (userId) enqueueOffline(userId, session);
      setStatus("done"); // queued locally; will sync on next successful flush
    }
  }

  // Note the last branch: once everything upstream has settled and there is
  // still no artifact, the route named a unit/skill the manifest doesn't
  // contain. That resolves to no fetch at all rather than to a failed one —
  // no query means no isError — so without this it would sit on the spinner
  // forever instead of saying the story doesn't exist.
  const derivedStatus: WalkthroughStatus =
    status === "submitting" || status === "done"
      ? status
      : bootstrap.isLoading || skillLoading
        ? "loading"
        : bootstrap.isError || skillError
          ? "error"
          : queue !== null && queue.length === 0 && totalCount === 0
            ? "empty"
            : queue !== null
              ? "ready"
              : "error";

  return {
    status: derivedStatus,
    title: artifact?.title ?? null,
    courseCode: course?.code ?? null,
    current,
    progress: { completed: totalCount - (queue?.length ?? totalCount), total: totalCount },
    submitAnswer,
    result,
  };
}
