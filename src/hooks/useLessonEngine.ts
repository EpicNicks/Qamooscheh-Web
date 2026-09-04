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
import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBootstrap } from "./useBootstrap";
import { useSkillArtifactsForRefs } from "./useCourseContent";
import { getNextSession } from "../api/sessionPlan";
import { submitSessions } from "../api/sessionSubmit";
import { useAuth } from "../auth/useAuth";
import { loadCardStates, mergeCardStates } from "../lib/cardStateStore";
import { enqueue as enqueueOffline } from "../lib/offlineQueue";
import { checkAnswer, type AnswerVerdict } from "../domain/answerFeedback";
import { resolveExerciseType } from "../domain/exerciseResolution";
import type { SkillRef, SubmittedItem, SubmittedSession, SubmittedSessionResponse } from "../types/api";
import type { ExerciseArtifact } from "../types/content";
import type { ExerciseType } from "../domain/enums";

const RETRY_DEPTH = 3;
// attempt < MAX_RETRIES gates the requeue in submitAnswer below — 2 means a
// wrong answer is requeued exactly once (attempt 1 requeues, attempt 2 does
// not), i.e. the exercise is asked at most twice total.
const MAX_RETRIES = 2;

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

/**
 * A recorded answer plus the skill the exercise actually came from. A session
 * plan's `skills` is a list, so a single lesson's items can span several
 * skills — finishLesson groups on this to submit one SubmittedSession per
 * skill instead of attributing everything to skills[0].
 */
interface RecordedItem {
  unitKey: string;
  skillKey: string;
  item: SubmittedItem;
}

export interface SubmitAnswerResult {
  correct: boolean;
  requeued: boolean;
  /** A short correction hint (e.g. "Close — a small typo.") when the answer was accepted imperfectly or rejected close — see domain/answerFeedback.ts. */
  note: string | null;
  /** The underlying verdict and 1-indexed attempt number, for domain/xp.ts's cosmetic per-answer XP tiering. */
  verdict: AnswerVerdict;
  attempt: number;
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

  /**
   * `dueTagsFilter: null` builds every exercise in these skills regardless of
   * FSRS due-ness — used by startPractice() below, so a learner is never
   * flat-out locked out of redoing a lesson just because nothing is
   * currently due for it (see finishLesson's practice-mode branch: no
   * credit, but the practice itself is always available).
   */
  function buildInstances(skillRefs: readonly SkillRef[], dueTagsFilter: Set<string> | null): LessonExerciseInstance[] {
    if (!userId) return [];
    const localCards = loadCardStates(userId);
    const instances: LessonExerciseInstance[] = [];

    for (const ref of skillRefs) {
      const artifact = skillArtifacts.get(`${ref.unitKey}/${ref.skillKey}`);
      if (!artifact) continue;
      artifact.exercises.forEach((exercise, ordinal) => {
        if (dueTagsFilter && !exercise.tags.some((tag) => dueTagsFilter.has(tag))) return;
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
  }

  const initialQueue = useMemo<LessonExerciseInstance[]>(() => {
    if (!skillsReady || !plan.data || !userId) return [];
    return buildInstances(plan.data.skills, dueTags);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillsReady, plan.data, userId, dueTags]);

  const [queue, setQueue] = useState<LessonExerciseInstance[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [items, setItems] = useState<RecordedItem[]>([]);
  const [status, setStatus] = useState<LessonStatus>("loading");
  const [result, setResult] = useState<SubmittedSessionResponse | null>(null);
  // First-attempt correctness only — a later successful retry doesn't add to
  // this, so the end-of-lesson fraction reflects "got it right the first
  // time" rather than "eventually got it", independent of the requeue depth.
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  // True for a session started via startPractice() rather than seeded from
  // the real due queue — finishLesson skips POST /v1/sessions/submit
  // entirely for these, so redoing a lesson never earns FSRS credit twice
  // (or grades a review that was never actually due) but is never blocked
  // either.
  const [isPracticeMode, setIsPracticeMode] = useState(false);
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

  /**
   * Restarts the latency clock. The page owning the answer-confirmation
   * screen calls this the moment the next exercise actually becomes visible,
   * so `latencyMs` measures answering time only — not the time the learner
   * spent reading the previous exercise's feedback. Stable identity so it can
   * sit in an effect's dependency list.
   */
  const markShown = useCallback(() => {
    shownAt.current = performance.now();
  }, []);

  /** Redo this lesson even though nothing's due for it — every exercise, no due-tag filter, no FSRS credit on completion (see finishLesson). Wired to the "Nothing due right now" screen's "Practice anyway" button so a learner is never simply locked out. */
  function startPractice() {
    if (!plan.data) return;
    const instances = buildInstances(plan.data.skills, null);
    setIsPracticeMode(true);
    setItems([]);
    setFirstTryCorrect(0);
    setResult(null);
    setStatus("ready");
    setQueue(instances);
    setTotalCount(instances.length);
    shownAt.current = performance.now();
  }

  async function submitAnswer(submittedText: string, opts?: { usedHint?: boolean }): Promise<SubmitAnswerResult> {
    if (!current || !queue) return { correct: false, requeued: false, note: null, verdict: "incorrect", attempt: 1 };

    const feedback = checkAnswer(course?.code, current.exercise, submittedText);
    const correct = feedback.verdict !== "incorrect";
    const latencyMs = Math.round(performance.now() - shownAt.current);
    const attempt = current.attempt + 1;

    if (current.attempt === 0 && correct) setFirstTryCorrect((n) => n + 1);

    const newItems = current.exercise.tags.map(
      (lexemeTag): RecordedItem => ({
        unitKey: current.unitKey,
        skillKey: current.skillKey,
        item: {
          exerciseOrdinal: current.ordinal,
          lexemeTag,
          exerciseType: current.renderType,
          scriptMode: current.exercise.scriptMode,
          submittedText,
          usedHint: opts?.usedHint ?? false,
          latencyMs,
          attempt,
        },
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
    // NOT the place to restart the latency clock: the answered exercise stays
    // on screen behind its feedback until the learner hits Continue, so
    // resetting here would bill the next exercise for the feedback-reading
    // time too. The page calls markShown() when the next one is really shown.

    if (rest.length === 0) {
      await finishLesson([...items, ...newItems]);
    }

    return { correct, requeued, note: feedback.note, verdict: feedback.verdict, attempt };
  }

  async function finishLesson(finalItems: RecordedItem[]) {
    if (!plan.data || !current) return;
    setStatus("submitting");

    if (isPracticeMode) {
      // Local-only recap — no POST /v1/sessions/submit, no card-state merge,
      // no bootstrap/plan refresh: nothing due changed, so nothing to credit.
      setStatus("done");
      return;
    }

    // One session per skill the items actually came from — a plan may list
    // several skills (§2.2), and grading an item under a skill it doesn't
    // belong to would corrupt that skill's FSRS state.
    const courseVersion = plan.data.courseVersion;
    const occurredAt = new Date().toISOString();
    const bySkill = new Map<string, SubmittedSession>();
    for (const recorded of finalItems) {
      const key = `${recorded.unitKey}/${recorded.skillKey}`;
      let session = bySkill.get(key);
      if (!session) {
        session = {
          submissionId: crypto.randomUUID(),
          unitKey: recorded.unitKey,
          skillKey: recorded.skillKey,
          courseVersion,
          occurredAt,
          completed: true,
          items: [],
        };
        bySkill.set(key, session);
      }
      session.items.push(recorded.item);
    }

    const sessions = [...bySkill.values()];
    if (sessions.length === 0) {
      setStatus("done");
      return;
    }

    try {
      const response = await submitSessions(sessions);
      // Cards come back per session; every one of them needs merging. `result`
      // only drives the recap's "Already recorded." line, so the first
      // response stands in for the batch.
      setResult(response.sessions[0] ?? null);
      if (userId) {
        for (const sessionResult of response.sessions) mergeCardStates(userId, sessionResult.cards);
      }
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      queryClient.invalidateQueries({ queryKey: ["sessionPlan"] });
      setStatus("done");
    } catch {
      if (userId) {
        for (const session of sessions) enqueueOffline(userId, session);
      }
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
    course,
    courseCode: course?.code ?? null,
    current,
    progress: { completed: totalCount - (queue?.length ?? totalCount), total: totalCount },
    score: { correct: firstTryCorrect, total: totalCount },
    isPracticeMode,
    submitAnswer,
    startPractice,
    markShown,
    result,
  };
}
