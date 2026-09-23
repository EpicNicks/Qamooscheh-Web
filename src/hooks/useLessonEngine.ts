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
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBootstrap } from "./useBootstrap";
import { useSkillArtifactsForRefs, useSkillArtifactsForLessonRefs, useThemeIndex, refKey } from "./useCourseContent";
import { getNextSession } from "../api/sessionPlan";
import { getSessionForLesson } from "../api/sessionForLesson";
import { submitSessions } from "../api/sessionSubmit";
import { ApiError } from "../api/httpClient";
import { useAuth } from "../auth/useAuth";
import { loadCardStates, mergeCardStates } from "../lib/cardStateStore";
import { enqueue as enqueueOffline } from "../lib/offlineQueue";
import { checkAnswer, type AnswerVerdict } from "../domain/answerFeedback";
import { resolveExerciseType } from "../domain/exerciseResolution";
import type { SessionPlanResponse, SkillRef, SubmittedItem, SubmittedSession, SubmittedSessionResponse } from "../types/api";
import type { ExerciseArtifact } from "../types/content";
import type { ExerciseType, SkillCategory } from "../domain/enums";

const RETRY_DEPTH = 3;
// attempt < MAX_RETRIES gates the requeue in submitAnswer below — 2 means a
// wrong answer is requeued exactly once (attempt 1 requeues, attempt 2 does
// not), i.e. the exercise is asked at most twice total.
const MAX_RETRIES = 2;
// Only applied to a multi-lesson remix (deepDiveLessonKeys.length > 1) — a
// due-tag union across several full lessons could otherwise run much longer
// than an ordinary session. A single-lesson dive (or the cursor path) is
// already naturally bounded by that one lesson's own size and stays uncapped.
const REMIX_MAX_EXERCISES = 20;

export interface LessonExerciseInstance {
  key: string;
  /** Null for a theme lesson with no journey position (deep-dive mode only). */
  unitKey: string | null;
  skillKey: string;
  ordinal: number;
  exercise: ExerciseArtifact;
  renderType: ExerciseType;
  attempt: number;
}

export type LessonStatus = "loading" | "empty" | "ready" | "submitting" | "done" | "rejected" | "error" | "unavailable";

/**
 * A submission the server answered 200 to but explicitly refused — one or
 * more sessions came back `outcome: "Rejected"` (a stale course version, a
 * skill the learner isn't provisioned for, …). A session simply missing from
 * the response isn't a rejection — see finishLesson, which requeues those
 * instead. The lesson is NOT complete when this is set, and
 * pages/LessonPage.tsx says so instead of showing the recap.
 */
export interface LessonRejection {
  /** The server's reason for the first rejected session, when it gave one. */
  reason: string | null;
  /** How many of the submitted sessions were rejected — `rejected < total` is a partial batch failure. */
  rejected: number;
  total: number;
}

/**
 * A recorded answer plus the skill the exercise actually came from. A session
 * plan's `skills` is a list, so a single lesson's items can span several
 * skills — finishLesson groups on this to submit one SubmittedSession per
 * skill instead of attributing everything to skills[0].
 */
interface RecordedItem {
  unitKey: string | null;
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
  /** What was actually graded — surfaced on the revealed-answer feedback so a learner can see exactly what the grader received (e.g. a word-bank submission whose tile order wasn't what they intended). */
  submittedText: string;
}

/**
 * @param deepDiveLessonKeys When set (non-empty), this is a deep-dive
 * session for one or more explicitly chosen lessons (each via GET
 * /v1/sessions/for-lesson/{lessonKey}) rather than the cursor-driven
 * "what's next" plan — the theme-browsing/"Deep Dive" counterpart
 * (API_SPEC.md §2.11). A single key is the ordinary "start this one lesson"
 * case; several is a blended "remix" session (LessonPage's
 * /lesson/deep-dive-remix route) — each lesson's plan is fetched
 * independently and merged client-side (skills/reviewTags/newTags/
 * prefetchTags unioned, courseVersion from whichever call succeeded first —
 * every call shares the same pinned version). A lesson that 404s is simply
 * dropped from the merge rather than failing the whole batch; only when
 * EVERY key fails does this surface as "unavailable"/"error", exactly
 * mirroring the single-key case's own 404 handling. Content is resolved via
 * the theme index's own path pointers instead of the unit-artifact
 * indirection the cursor path uses, since a standalone lesson has no unit
 * artifact. Submit is otherwise identical — no special-cased path: whatever
 * distinct (unitKey, skillKey) pairs actually got answered are what
 * finishLesson groups into one SubmittedSession each, regardless of how many
 * lessons that spans.
 */
export function useLessonEngine(deepDiveLessonKeys?: string[]) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  // The ARRAY'S PRESENCE selects the mode, not its length — an empty array
  // still means "deep-dive mode, keys not resolved yet" (LessonPage's remix
  // route computes its key list asynchronously, from the source lesson's own
  // themes + local FSRS state, and starts out with nothing to pass). Treating
  // an empty array as "not deep-diving" would make the engine fall back to
  // fetching the cursor-driven plan for that brief window instead of simply
  // waiting — see deepDivePlanIsLoading below for the loading-state half of
  // this.
  const isDeepDive = deepDiveLessonKeys != null;

  const bootstrap = useBootstrap();
  const course = bootstrap.data?.course ?? null;

  // Cursor-driven mode's own query — enabled only when NOT deep-diving.
  const cursorPlan = useQuery({
    queryKey: ["sessionPlan"],
    queryFn: getNextSession,
    enabled: bootstrap.isSuccess && !isDeepDive,
  });

  // Deep-dive mode's queries — one per lesson key, independently retryable
  // (a lesson outside the learner's pinned version 404s rather than being a
  // transient failure, so retrying it would just 404 again).
  const deepDiveQueries = useQueries({
    queries: (isDeepDive ? deepDiveLessonKeys! : []).map((key) => ({
      queryKey: ["sessionForLesson", key],
      queryFn: () => getSessionForLesson(key),
      enabled: bootstrap.isSuccess,
      retry: false,
    })),
  });
  const deepDiveSucceeded = deepDiveQueries
    .map((q) => q.data)
    .filter((d): d is SessionPlanResponse => d != null);
  const deepDivePlanData: SessionPlanResponse | undefined =
    isDeepDive && deepDiveSucceeded.length > 0
      ? {
          courseVersion: deepDiveSucceeded[0].courseVersion,
          skills: deepDiveSucceeded.flatMap((p) => p.skills),
          reviewTags: [...new Set(deepDiveSucceeded.flatMap((p) => p.reviewTags))],
          newTags: [...new Set(deepDiveSucceeded.flatMap((p) => p.newTags))],
          prefetchTags: [...new Set(deepDiveSucceeded.flatMap((p) => p.prefetchTags))],
        }
      : undefined;
  // "Unavailable" only once every key has failed AND at least one of those
  // failures was a real 404 — otherwise a batch of transient network errors
  // would misreport as "this lesson doesn't exist" (falls through to the
  // generic "error" status instead, via deepDivePlanIsError below).
  const isLessonNotFound =
    isDeepDive &&
    deepDivePlanData == null &&
    deepDiveQueries.length > 0 &&
    deepDiveQueries.every((q) => q.isError) &&
    deepDiveQueries.some((q) => q.error instanceof ApiError && q.error.status === 404);
  // Empty key list counts as loading too (see isDeepDive's own comment) —
  // only once LessonPage has actually resolved a real (possibly single-
  // element, see its own fallback) key list do the individual queries below
  // get a chance to settle.
  const deepDivePlanIsLoading =
    isDeepDive &&
    deepDivePlanData == null &&
    (deepDiveLessonKeys!.length === 0 || deepDiveQueries.some((q) => q.isLoading));
  const deepDivePlanIsError =
    isDeepDive && deepDivePlanData == null && deepDiveQueries.length > 0 && deepDiveQueries.every((q) => q.isError);

  // Same shape as react-query's own return (only the fields this hook
  // actually reads below) — lets every existing `plan.data`/`plan.isLoading`/
  // `plan.isError` reference below stay unchanged regardless of which mode
  // is active.
  const plan = isDeepDive
    ? { data: deepDivePlanData, isLoading: deepDivePlanIsLoading, isError: deepDivePlanIsError }
    : cursorPlan;

  // The learner's current cursor, reused as the practice-mode skill whenever
  // `plan.data.skills` comes back empty — which it does whenever nothing's
  // due (§2.2: the plan lists what's due, not "whatever skill you're on"), so
  // startPractice can't just drop the due-tag filter and reuse that list the
  // way it does when something IS due. Cursor-only concept — never applies
  // to a deep dive, which is always about one explicitly chosen lesson.
  const positionRef: SkillRef | null =
    !isDeepDive && bootstrap.data?.position
      ? { unitKey: bootstrap.data.position.unitKey, skillKey: bootstrap.data.position.skillKey }
      : null;

  const skillRefsToLoad = useMemo<SkillRef[]>(() => {
    const dueRefs = plan.data?.skills ?? [];
    return dueRefs.length > 0 || !positionRef ? dueRefs : [positionRef];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- positionRef is a fresh object each render; unitKey/skillKey are its only meaningful identity.
  }, [plan.data, positionRef?.unitKey, positionRef?.skillKey]);

  // Both content-resolution paths are called unconditionally (rules of
  // hooks) and the active one is picked by `isDeepDive` — cheap, since
  // useThemeIndex/useSkillArtifactsForRefs are no-ops when their inputs are
  // empty and both share react-query's cache with every other screen.
  const themeIndex = useThemeIndex(isDeepDive ? course : null);
  const cursorContent = useSkillArtifactsForRefs(isDeepDive ? null : course, isDeepDive ? [] : skillRefsToLoad);
  const deepDiveContent = useSkillArtifactsForLessonRefs(
    isDeepDive ? course : null,
    themeIndex.data,
    isDeepDive ? skillRefsToLoad : [],
  );
  const { skills: skillArtifacts, isLoading: skillsLoading, isError: skillsError } = isDeepDive
    ? {
        skills: deepDiveContent.skills,
        isLoading: deepDiveContent.isLoading || themeIndex.isLoading,
        isError: deepDiveContent.isError || themeIndex.isError,
      }
    : cursorContent;

  const skillsReady = !!plan.data && plan.data.skills.every((ref) => skillArtifacts.has(refKey(ref)));

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
      const artifact = skillArtifacts.get(refKey(ref));
      if (!artifact) continue;
      artifact.exercises.forEach((exercise, ordinal) => {
        if (dueTagsFilter && !exercise.tags.some((tag) => dueTagsFilter.has(tag))) return;
        // An exercise with no tags at all has no card to resolve its render
        // mode against — without the guard, `tags[0]` is `undefined` and the
        // lookup becomes `localCards["undefined"]`, which quietly matches a
        // real stored card if one ever happened to be keyed that way. `null`
        // is the honest answer: treat it as never-seen.
        const primaryTag = exercise.tags[0];
        const primaryCardState = (primaryTag ? localCards[primaryTag] : null) ?? null;
        instances.push({
          key: `${refKey(ref)}/${ordinal}`,
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

  const isRemix = !!deepDiveLessonKeys && deepDiveLessonKeys.length > 1;

  const initialQueue = useMemo<LessonExerciseInstance[]>(() => {
    if (!skillsReady || !plan.data || !userId) return [];
    const instances = buildInstances(plan.data.skills, dueTags);
    return isRemix ? instances.slice(0, REMIX_MAX_EXERCISES) : instances;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillsReady, plan.data, userId, dueTags, isRemix]);

  const [queue, setQueue] = useState<LessonExerciseInstance[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [items, setItems] = useState<RecordedItem[]>([]);
  const [status, setStatus] = useState<LessonStatus>("loading");
  const [result, setResult] = useState<SubmittedSessionResponse | null>(null);
  const [rejection, setRejection] = useState<LessonRejection | null>(null);
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
  // Snapshot of plan.data.skills taken once, when the queue is first built —
  // retained even after the queue empties (unlike plan.data itself, which a
  // background refetch could change). LessonPage's deep-dive recap needs this
  // after status is "done" to resolve "Deep Dive" themes and to know
  // whether the lesson it just finished had a journey position at all.
  const [sessionSkillRefs, setSessionSkillRefs] = useState<SkillRef[]>([]);
  const [sessionSkillCategory, setSessionSkillCategory] = useState<SkillCategory | null>(null);
  const shownAt = useRef<number>(performance.now());

  // The learner's cursor position captured once, the first time bootstrap
  // resolves — `undefined` means "not captured yet" (distinct from `null`,
  // "no cursor at all"). Compared against the post-submit position below to
  // detect a deep dive's fast-forward (API_SPEC.md §2.11), without needing
  // any new signal from the server.
  const startingPositionRef = useRef<{ unitKey: string; skillKey: string } | null | undefined>(undefined);
  if (startingPositionRef.current === undefined && bootstrap.isSuccess) {
    startingPositionRef.current = bootstrap.data?.position ?? null;
  }

  // Seed local state once content resolves — a ref-guarded effect would be
  // the "proper" way, but a plain lazy check keeps this hook dependency-free
  // of useEffect entirely, which matters here because re-seeding on every
  // background refetch of `plan`/`skillArtifacts` would blow away in-progress
  // answers.
  if (queue === null && skillsReady && plan.data) {
    setQueue(initialQueue);
    setTotalCount(initialQueue.length);
    // Derived from the actual built (and possibly REMIX_MAX_EXERCISES-
    // truncated) queue, not plan.data.skills directly — a remix's merged
    // plan can list a lesson whose exercises got truncated away entirely,
    // and that lesson was never actually played.
    const playedRefs: SkillRef[] = [];
    const seenKeys = new Set<string>();
    for (const instance of initialQueue) {
      const key = refKey(instance);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      playedRefs.push({ unitKey: instance.unitKey, skillKey: instance.skillKey });
    }
    setSessionSkillRefs(playedRefs);
    const primaryRef = playedRefs[0];
    setSessionSkillCategory(primaryRef ? (skillArtifacts.get(refKey(primaryRef))?.category ?? null) : null);
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

  /**
   * Redo this lesson even though nothing's due for it — every exercise, no
   * due-tag filter, no FSRS credit on completion (see finishLesson). Wired to
   * the "Nothing due right now" screen's "Practice anyway" button so a
   * learner is never simply locked out.
   *
   * Falls back to the current cursor (`positionRef`) when `plan.data.skills`
   * is empty — the normal shape of "nothing's due" — since that's exactly
   * the case this button exists for; reusing an empty list here would build
   * zero instances and silently do nothing.
   */
  function startPractice() {
    if (!plan.data) return;
    const refs = plan.data.skills.length > 0 ? plan.data.skills : positionRef ? [positionRef] : [];
    if (refs.length === 0) return;
    const built = buildInstances(refs, null);
    const instances = isRemix ? built.slice(0, REMIX_MAX_EXERCISES) : built;
    setIsPracticeMode(true);
    setItems([]);
    setFirstTryCorrect(0);
    setResult(null);
    setRejection(null);
    setStatus("ready");
    setQueue(instances);
    setTotalCount(instances.length);
    shownAt.current = performance.now();
  }

  async function submitAnswer(submittedText: string, opts?: { usedHint?: boolean }): Promise<SubmitAnswerResult> {
    if (!current || !queue) return { correct: false, requeued: false, note: null, verdict: "incorrect", attempt: 1, submittedText };

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

    return { correct, requeued, note: feedback.note, verdict: feedback.verdict, attempt, submittedText };
  }

  async function finishLesson(finalItems: RecordedItem[]) {
    if (!plan.data || !current || !course) return;
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
      const key = `${recorded.unitKey ?? "_"}/${recorded.skillKey}`;
      let session = bySkill.get(key);
      if (!session) {
        session = {
          submissionId: crypto.randomUUID(),
          unitKey: recorded.unitKey,
          skillKey: recorded.skillKey,
          courseCode: course.code,
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
        for (const sessionResult of response.sessions) {
          // A rejected session was never graded, so it has no card state worth
          // merging (and trusting one would write FSRS state the server didn't
          // actually record).
          if (sessionResult.outcome !== "Rejected") mergeCardStates(userId, sessionResult.cards);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      queryClient.invalidateQueries({ queryKey: ["sessionPlan"] });
      // Whichever lesson(s) this session covered may now be complete, in the
      // journey or standalone — theme-browsing's grey-out relies on this
      // being fresh.
      queryClient.invalidateQueries({ queryKey: ["lessonsCompleted"] });

      // 200 does NOT mean "every session landed": §2.3 answers per session,
      // and one can come back Rejected (stale course version, not
      // provisioned, …) while the request itself succeeded.
      const answered = new Set(response.sessions.map((s) => s.submissionId));
      const rejected = response.sessions.filter((s) => s.outcome === "Rejected");
      // Missing from the response isn't the server refusing it — it's the
      // server simply not answering for it (a partial batch failure). That's
      // a delivery problem, not a rejection: requeue it exactly like a
      // network failure would, instead of discarding it as unrecoverable.
      const missing = sessions.filter((s) => !answered.has(s.submissionId));
      if (missing.length > 0 && userId) {
        for (const session of missing) enqueueOffline(userId, session);
      }

      if (rejected.length > 0) {
        setRejection({
          reason: rejected.find((s) => s.rejectionReason)?.rejectionReason ?? null,
          rejected: rejected.length,
          total: sessions.length,
        });
        setStatus("rejected");
        return;
      }

      // Anything missing is queued locally and will sync on the next flush —
      // same as a network failure, so it's fair to call the lesson done.
      setStatus("done");
    } catch {
      if (userId) {
        for (const session of sessions) enqueueOffline(userId, session);
      }
      setStatus("done"); // queued locally; will sync on next successful flush
    }
  }

  const derivedStatus: LessonStatus =
    status === "submitting" || status === "done" || status === "rejected"
      ? status
      : isLessonNotFound
        ? "unavailable"
        : bootstrap.isLoading || plan.isLoading || skillsLoading
          ? "loading"
          : bootstrap.isError || plan.isError || skillsError
            ? "error"
            : queue !== null && queue.length === 0 && totalCount === 0
              ? "empty"
              : "ready";

  // Only meaningful once the deep dive is done and AT LEAST ONE session skill
  // had a journey position — a standalone lesson can never move the cursor,
  // but a remix spanning several lessons only needs one of them to (checking
  // sessionSkillRefs[0] alone would miss it whenever the journeyed lesson
  // wasn't the first one merged in). See startingPositionRef's own comment
  // for what this compares.
  const journeyAdvanced =
    isDeepDive &&
    derivedStatus === "done" &&
    sessionSkillRefs.some((ref) => ref.unitKey != null) &&
    startingPositionRef.current !== undefined &&
    bootstrap.data?.position != null &&
    (startingPositionRef.current === null ||
      startingPositionRef.current.unitKey !== bootstrap.data.position.unitKey ||
      startingPositionRef.current.skillKey !== bootstrap.data.position.skillKey);

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
    /** Non-null exactly when `status === "rejected"` — what the server refused, and how much of the batch. */
    rejection,
    /** Snapshot of the plan's skills, retained after the queue empties — for resolving "Deep Dive" themes and whether this session came from a journeyed lesson. */
    sessionSkillRefs,
    sessionSkillCategory,
    /** True when finishing a deep-dive lesson also moved the learner's Journey cursor forward (API_SPEC.md §2.11's fast-forward). Client-derived from a before/after position diff — no dedicated backend signal exists for this. */
    journeyAdvanced,
  };
}
