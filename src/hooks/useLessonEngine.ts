// The core "take a lesson" state machine (API_SPEC.md §2.2/§2.3/§2.5):
//   1. GET /v1/sessions/next -> which skill(s), which lexeme tags are due
//      for review vs. new.
//   2. Fetch that skill's exercises from the CDN, keep the ones whose tags
//      intersect (reviewTags ∪ newTags) — Api never returns exercise
//      content itself (§1).
//   3. Resolve each composite exercise's first-shown render mode from local
//      card state (domain/exerciseResolution.ts).
//   4. Run the queue: correct -> drop it; incorrect -> requeue deeper
//      (retryDepth), stop requeuing once maxRetries is hit (§2.5's
//      in-lesson retry queue).
//   5. On completion, POST /v1/sessions/submit with every attempt recorded;
//      merge the returned card states locally and refresh bootstrap/plan.
//      A network failure queues the session for a later flush instead of
//      losing it (lib/offlineQueue.ts).
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBootstrap } from "./useBootstrap";
import { useSkillArtifactsForRefs } from "./useCourseContent";
import { getNextSession } from "../api/sessionPlan";
import { submitSessions } from "../api/sessionSubmit";
import { useAuth } from "../auth/useAuth";
import { loadCardStates, mergeCardStates } from "../lib/cardStateStore";
import { enqueue as enqueueOffline } from "../lib/offlineQueue";
import { looksCorrect } from "../lib/textMatch";
import { resolveExerciseType } from "../domain/exerciseResolution";
import type { SubmittedItem, SubmittedSession, SubmittedSessionResponse } from "../types/api";
import type { ExerciseArtifact } from "../types/content";
import type { ExerciseType } from "../domain/enums";

const RETRY_DEPTH = 3;
const MAX_RETRIES = 3;

export interface LessonExerciseInstance {
  key: string;
  unitKey: string;
  skillKey: string;
  ordinal: number;
  exercise: ExerciseArtifact;
  renderType: ExerciseType;
  attempt: number;
}

export type LessonStatus = "loading" | "empty" | "ready" | "submitting" | "done" | "error";

export interface SubmitAnswerResult {
  correct: boolean;
  requeued: boolean;
}

export function useLessonEngine() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const bootstrap = useBootstrap();
  const course = bootstrap.data?.course ?? null;

  const plan = useQuery({
    queryKey: ["sessionPlan"],
    queryFn: getNextSession,
    enabled: bootstrap.isSuccess,
  });

  const { skills: skillArtifacts, isLoading: skillsLoading, isError: skillsError } = useSkillArtifactsForRefs(
    course,
    plan.data?.skills ?? [],
  );

  const skillsReady = !!plan.data && plan.data.skills.every((ref) => skillArtifacts.has(`${ref.unitKey}/${ref.skillKey}`));

  const dueTags = useMemo(() => new Set([...(plan.data?.reviewTags ?? []), ...(plan.data?.newTags ?? [])]), [plan.data]);

  const initialQueue = useMemo<LessonExerciseInstance[]>(() => {
    if (!skillsReady || !plan.data || !userId) return [];
    const localCards = loadCardStates(userId);
    const instances: LessonExerciseInstance[] = [];

    for (const ref of plan.data.skills) {
      const artifact = skillArtifacts.get(`${ref.unitKey}/${ref.skillKey}`);
      if (!artifact) continue;
      artifact.exercises.forEach((exercise, ordinal) => {
        if (!exercise.tags.some((tag) => dueTags.has(tag))) return;
        const primaryCardState = localCards[exercise.tags[0]] ?? null;
        instances.push({
          key: `${ref.unitKey}/${ref.skillKey}/${ordinal}`,
          unitKey: ref.unitKey,
          skillKey: ref.skillKey,
          ordinal,
          exercise,
          renderType: resolveExerciseType(exercise, primaryCardState),
          attempt: 0,
        });
      });
    }
    return instances;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillsReady, plan.data, userId]);

  const [queue, setQueue] = useState<LessonExerciseInstance[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [items, setItems] = useState<SubmittedItem[]>([]);
  const [status, setStatus] = useState<LessonStatus>("loading");
  const [result, setResult] = useState<SubmittedSessionResponse | null>(null);
  const shownAt = useRef<number>(performance.now());

  // Seed local state once content resolves — a ref-guarded effect would be
  // the "proper" way, but a plain lazy check keeps this hook dependency-free
  // of useEffect entirely, which matters here because re-seeding on every
  // background refetch of `plan`/`skillArtifacts` would blow away in-progress
  // answers.
  if (queue === null && skillsReady && plan.data) {
    setQueue(initialQueue);
    setTotalCount(initialQueue.length);
    shownAt.current = performance.now();
  }

  const current = queue && queue.length > 0 ? queue[0] : null;

  async function submitAnswer(submittedText: string, opts?: { usedHint?: boolean }): Promise<SubmitAnswerResult> {
    if (!current || !queue) return { correct: false, requeued: false };

    const correct = looksCorrect(submittedText, current.exercise.answer);
    const latencyMs = Math.round(performance.now() - shownAt.current);
    const attempt = current.attempt + 1;

    const newItems = current.exercise.tags.map(
      (lexemeTag): SubmittedItem => ({
        exerciseOrdinal: current.ordinal,
        lexemeTag,
        exerciseType: current.renderType,
        scriptMode: current.exercise.scriptMode,
        submittedText,
        usedHint: opts?.usedHint ?? false,
        latencyMs,
        attempt,
      }),
    );
    setItems((prev) => [...prev, ...newItems]);

    const rest = queue.slice(1);
    let requeued = false;

    if (!correct && attempt < MAX_RETRIES) {
      const insertAt = Math.min(RETRY_DEPTH, rest.length);
      const requeuedInstance: LessonExerciseInstance = { ...current, attempt };
      rest.splice(insertAt, 0, requeuedInstance);
      requeued = true;
    }

    setQueue(rest);
    shownAt.current = performance.now();

    if (rest.length === 0) {
      await finishLesson([...items, ...newItems]);
    }

    return { correct, requeued };
  }

  async function finishLesson(finalItems: SubmittedItem[]) {
    if (!plan.data || !current) return;
    setStatus("submitting");

    const primaryRef = plan.data.skills[0];
    const session: SubmittedSession = {
      submissionId: crypto.randomUUID(),
      unitKey: primaryRef.unitKey,
      skillKey: primaryRef.skillKey,
      courseVersion: plan.data.courseVersion,
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
      queryClient.invalidateQueries({ queryKey: ["sessionPlan"] });
      setStatus("done");
    } catch {
      if (userId) enqueueOffline(userId, session);
      setStatus("done"); // queued locally; will sync on next successful flush
    }
  }

  const derivedStatus: LessonStatus =
    status === "submitting" || status === "done"
      ? status
      : bootstrap.isLoading || plan.isLoading || skillsLoading
        ? "loading"
        : bootstrap.isError || plan.isError || skillsError
          ? "error"
          : queue !== null && queue.length === 0 && totalCount === 0
            ? "empty"
            : "ready";

  return {
    status: derivedStatus,
    current,
    progress: { completed: totalCount - (queue?.length ?? totalCount), total: totalCount },
    submitAnswer,
    result,
  };
}
