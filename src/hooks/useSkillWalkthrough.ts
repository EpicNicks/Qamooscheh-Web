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
import { useGrader } from "../grader/useGrader";
import type { Grader } from "../grader/types";
import { mergeCardStates } from "../lib/cardStateStore";
import { enqueue as enqueueOffline } from "../lib/offlineQueue";
import { checkAnswer, type SeparatorMarks } from "../domain/answerFeedback";
import { resolveExerciseType } from "../domain/exerciseResolution";
import { loadGate, pinFirst } from "../domain/lessonPin";
import { verdictWeight } from "../domain/lessonScore";
import type { SubmittedItem, SubmittedSession, SubmittedSessionResponse } from "../types/api";
import type { ExerciseArtifact } from "../types/content";
import type { ExerciseType } from "../domain/enums";

export interface WalkthroughExerciseInstance {
  key: string;
  unitKey: string;
  skillKey: string;
  ordinal: number;
  exercise: ExerciseArtifact;
  renderType: ExerciseType;
}

export type WalkthroughStatus = "loading" | "empty" | "ready" | "submitting" | "done" | "error";

export interface WalkthroughAnswerResult {
  correct: boolean;
  note: string | null;
  /** What was actually graded — surfaced on the revealed-answer feedback so a learner can see exactly what the grader received. */
  submittedText: string;
  /** The grader's separator edits when a half-space or space was off but the answer was accepted — the review marks where (domain/typedAnswerMarks.ts). */
  separators?: SeparatorMarks | null;
}

export interface SkillWalkthroughOptions {
  /**
   * Re-practicing a skill the learner has already passed (pages/PracticePage.tsx).
   * Mirrors useLessonEngine's practice mode: the run is local-only — no POST
   * /v1/sessions/submit, no `completed: true`, no card merge — so a practice
   * round can never earn FSRS credit twice or re-grade a review that wasn't
   * due, while staying available at any time.
   */
  practice?: boolean;
}

export function useSkillWalkthrough(unitKey: string, skillKey: string, options: SkillWalkthroughOptions = {}) {
  const isPracticeMode = options.practice ?? false;
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const bootstrap = useBootstrap();
  const liveGrader = useGrader();
  const liveCourse = bootstrap.data?.course ?? null;
  // A run pins the course and grader it started with (domain/lessonPin.ts): a
  // bootstrap refetch mid-run, failed or rolled forward by a deploy, must not
  // swap the content or the grader under it. The course is frozen when the
  // queue is seeded below.
  const [startedCourse, setStartedCourse] = useState<{ course: typeof liveCourse } | null>(null);
  const course = startedCourse ? startedCourse.course : liveCourse;
  const [pinnedGrader, setPinnedGrader] = useState<Grader | null>(null);
  const grader = pinFirst(pinnedGrader, liveGrader);
  if (pinnedGrader === null && grader !== null) setPinnedGrader(grader);

  const refs = [{ unitKey, skillKey }];
  const { skills, isLoading: skillLoading, isError: skillError } = useSkillArtifactsForRefs(course, refs);
  const artifact = skills.get(`${unitKey}/${skillKey}`) ?? null;

  // Plain derivation rather than useMemo: it's one map over a handful of
  // exercises, and it's read once, at the seeding check below.
  const instances: WalkthroughExerciseInstance[] = artifact
    ? artifact.exercises.map((exercise, ordinal) => ({
        key: `${unitKey}/${skillKey}/${ordinal}`,
        unitKey,
        skillKey,
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
  // Scored the way useLessonEngine scores first attempts — with no retry
  // queue here, every answer is a first attempt. `correct` counts answers
  // accepted at all; points weight them as domain/lessonScore.ts does.
  const [correctCount, setCorrectCount] = useState(0);
  const [points, setPoints] = useState(0);

  // Seeded lazily, exactly as useLessonEngine does and for the same reason:
  // re-seeding on a background refetch would discard answers already given.
  if (queue === null && artifact) {
    setStartedCourse({ course: liveCourse });
    setQueue(instances);
    setTotalCount(instances.length);
  }

  const current = queue && queue.length > 0 ? queue[0] : null;

  /** Synchronous for the same reason as useLessonEngine's submitAnswer: the review has to appear in the same render the queue advances in. */
  function submitAnswer(submittedText: string, opts?: { usedHint?: boolean }): WalkthroughAnswerResult {
    if (!current || !queue) return { correct: false, note: null, submittedText };

    const feedback = checkAnswer(grader, course?.code, current.exercise, submittedText, { usedHint: opts?.usedHint });

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
    if (feedback.verdict !== "incorrect") setCorrectCount((n) => n + 1);
    setPoints((p) => p + verdictWeight(feedback.verdict));

    // Always advance: a chapter reads forward whether or not the learner got
    // the line exactly right. The server still grades every item.
    const rest = queue.slice(1);
    setQueue(rest);

    if (rest.length === 0) void finish([...items, ...newItems]);

    return { correct: feedback.verdict !== "incorrect", note: feedback.note, submittedText, separators: feedback.separators };
  }

  async function finish(finalItems: SubmittedItem[]) {
    if (!course) return;
    setStatus("submitting");

    if (isPracticeMode) {
      // Local-only recap, exactly as useLessonEngine's practice branch: no
      // POST /v1/sessions/submit, no card-state merge, no bootstrap refresh.
      // Nothing was due, so there is nothing to credit.
      setStatus("done");
      return;
    }

    const session: SubmittedSession = {
      submissionId: crypto.randomUUID(),
      unitKey,
      skillKey,
      courseCode: course.code,
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
      // A pass here can complete a lesson (a fork alternate's first attempt),
      // so the path's completion marks and the cursor's plan must refetch.
      queryClient.invalidateQueries({ queryKey: ["sessionPlan"] });
      queryClient.invalidateQueries({ queryKey: ["lessonsCompleted"] });
      queryClient.invalidateQueries({ queryKey: ["streak"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
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
  const gate = loadGate(queue !== null, bootstrap.isLoading || skillLoading, bootstrap.isError || skillError);
  const derivedStatus: WalkthroughStatus =
    status === "submitting" || status === "done"
      ? status
      : gate === "loading"
        ? "loading"
        : gate === "error"
          ? "error"
          : queue !== null && queue.length === 0 && totalCount === 0
            ? "empty"
            : queue !== null
              ? "ready"
              : "error";

  return {
    status: derivedStatus,
    title: artifact?.title ?? null,
    course,
    courseCode: course?.code ?? null,
    current,
    /** The chapter's full, authored-order exercise list — every line, not just what's left in the queue. StoryTranscript reads this to render the lines already answered and the ones still ahead alongside `current`. */
    instances,
    progress: { completed: totalCount - (queue?.length ?? totalCount), total: totalCount },
    /** First-try score, shaped like useLessonEngine's: `score` (0..1) is the weighted one. */
    score: { correct: correctCount, total: totalCount, score: totalCount === 0 ? 0 : points / totalCount },
    isPracticeMode,
    submitAnswer,
    result,
  };
}
