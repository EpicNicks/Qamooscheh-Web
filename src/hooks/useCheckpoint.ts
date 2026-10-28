// The placement-test/"gauntlet" flow (API_SPEC.md §2.7): sample exercises
// from every skill between the learner's cursor and a target, answer them in
// one sitting, submit once. No client-only retry queue here — unlike an
// ordinary lesson (§2.5), a checkpoint is one attempt at one target; a wrong
// answer is just a wrong answer, not something to requeue for a second try.
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCheckpointPlan, submitCheckpoint } from "../api/checkpoint";
import { useSkillArtifactsForRefs } from "./useCourseContent";
import { useBootstrap } from "./useBootstrap";
import { ApiError } from "../api/httpClient";
import {
  clearCheckpointAttempt,
  loadCheckpointAttempt,
  saveCheckpointAttempt,
} from "../lib/checkpointAttempt";
import { useAuth } from "../auth/useAuth";
import { loadCardStates, mergeCardStates } from "../lib/cardStateStore";
import { resolveExerciseType } from "../domain/exerciseResolution";
import { isPlayable } from "../domain/recordings";
import { versionMismatch } from "../domain/lessonPin";
import type { CheckpointSkillAnswers, CheckpointSubmitResponse, SubmitCheckpointRequest, SubmittedItem } from "../types/api";
import type { ExerciseArtifact } from "../types/content";
import type { ExerciseType } from "../domain/enums";

export interface CheckpointExerciseInstance {
  key: string;
  unitKey: string;
  skillKey: string;
  ordinal: number;
  exercise: ExerciseArtifact;
  /** How this one is actually presented — a composite's authored `type` isn't it (domain/exerciseResolution.ts), and this is what gets submitted as `exerciseType`. */
  renderType: ExerciseType;
}

export function useCheckpoint(targetUnitKey: string, targetSkillKey: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const bootstrap = useBootstrap();

  const plan = useQuery({
    queryKey: ["checkpoint", "plan", targetUnitKey, targetSkillKey],
    queryFn: () => getCheckpointPlan(targetUnitKey, targetSkillKey),
    enabled: bootstrap.isSuccess,
  });

  // Derived skip state (API_SPEC.md §2.11) — the backend now reports this
  // explicitly rather than leaving the client to infer it from the range and
  // its own completion history. `requiresTest: false` means every skipped
  // position is already satisfied some other way (most often a deep dive);
  // `instances` below then comes back naturally empty, since those positions
  // are excluded from the plan's own exercise sampling.
  const skippedCount = plan.data?.skippedCount ?? 0;
  const alreadyCompletedCount = plan.data?.alreadyCompletedCount ?? 0;
  const requiresTest = plan.data?.requiresTest ?? true;

  const refs = useMemo(
    () => plan.data?.skills.map((s) => ({ unitKey: s.unitKey, skillKey: s.skillKey })) ?? [],
    [plan.data],
  );
  const { skills: skillArtifacts, isLoading: skillsLoading, isError: skillsError } = useSkillArtifactsForRefs(
    bootstrap.data?.course ?? null,
    refs,
  );

  const instances = useMemo<CheckpointExerciseInstance[]>(() => {
    if (!plan.data) return [];
    // Same local card history useLessonEngine resolves composites against, so
    // a checkpoint question is presented the way a lesson would have
    // presented it rather than always as type-in.
    const localCards = userId ? loadCardStates(userId) : {};
    const artifactFor = (unitKey: string, skillKey: string) => skillArtifacts.get(`${unitKey}/${skillKey}`);
    // Nothing until every skill's artifact has loaded, rather than a partial list.
    if (!plan.data.skills.every((skillPlan) => artifactFor(skillPlan.unitKey, skillPlan.skillKey))) return [];
    return plan.data.skills.flatMap((skillPlan) => {
      const artifact = artifactFor(skillPlan.unitKey, skillPlan.skillKey)!;
      return skillPlan.exerciseOrdinals.flatMap((ordinal) => {
        const exercise = artifact.exercises[ordinal];
        if (!exercise || !isPlayable(exercise)) return [];
        return [
          {
            key: `${skillPlan.unitKey}/${skillPlan.skillKey}/${ordinal}`,
            unitKey: skillPlan.unitKey,
            skillKey: skillPlan.skillKey,
            ordinal,
            exercise,
            renderType: resolveExerciseType(exercise, localCards[exercise.tags[0]] ?? null),
          },
        ];
      });
    });
  }, [plan.data, skillArtifacts, userId]);

  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [index, setIndex] = useState(0);
  const [submitResult, setSubmitResult] = useState<CheckpointSubmitResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Set when POST /v1/checkpoint fails (network, 409, 5xx). CheckpointPage
  // renders it and leaves the Submit button live so the learner can retry —
  // without this the rejection was unhandled and the page said nothing.
  const [submitError, setSubmitError] = useState<string | null>(null);

  const current = instances[index] ?? null;

  // The plan is resolved under one course version and the exercises load under
  // the bootstrap's; when they differ the test would show one version's
  // questions and submit them as another's. Held back until the first answer
  // (reopening then costs nothing); the stale side is usually the cached
  // bootstrap, so one re-read may settle it without the learner doing anything.
  const outdated = answers.size === 0 && versionMismatch(plan.data?.courseVersion, bootstrap.data?.course?.version);
  const refetchBootstrap = bootstrap.refetch;
  useEffect(() => {
    if (outdated) void refetchBootstrap();
  }, [outdated, refetchBootstrap]);

  function answerCurrent(text: string) {
    if (!current) return;
    setAnswers((prev) => new Map(prev).set(current.key, text));
    // Always advance, even past the last question — `current` becoming null
    // is what drives CheckpointPage's "ready to submit" screen.
    setIndex((i) => i + 1);
  }

  // The request is persisted (lib/checkpointAttempt.ts) before it's sent and
  // reused as-is by every retry, including after a reload: if a request
  // reached the server but its response was lost, the retry must carry the
  // same ids so the server replays it instead of grading a second attempt.
  const [pendingVersion, setPendingVersion] = useState(0);
  const pending = useMemo(
    () => (userId ? loadCheckpointAttempt(userId, targetUnitKey, targetSkillKey) : null),
    // pendingVersion re-reads storage after a save/clear.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, targetUnitKey, targetSkillKey, pendingVersion],
  );
  const submitting = useRef(false);

  function buildRequest(courseVersion: number): SubmitCheckpointRequest {
    const bySkill = new Map<string, SubmittedItem[]>();
    for (const instance of instances) {
      const submittedText = answers.get(instance.key) ?? "";
      const skillKey = `${instance.unitKey}/${instance.skillKey}`;
      const items = bySkill.get(skillKey) ?? [];
      for (const lexemeTag of instance.exercise.tags) {
        items.push({
          exerciseOrdinal: instance.ordinal,
          lexemeTag,
          exerciseType: instance.renderType,
          scriptMode: instance.exercise.scriptMode,
          submittedText,
          usedHint: false,
          latencyMs: null,
          attempt: 1,
        });
      }
      bySkill.set(skillKey, items);
    }

    const skills: CheckpointSkillAnswers[] = Array.from(bySkill.entries()).map(([key, items]) => {
      const [unitKey, skillKey] = key.split("/");
      return { unitKey, skillKey, items };
    });

    return {
      submissionId: crypto.randomUUID(),
      targetUnitKey,
      targetSkillKey,
      courseVersion,
      occurredAt: new Date().toISOString(),
      skills,
    };
  }

  async function submit() {
    if (submitting.current) return;
    if (!pending && !plan.data) return;
    submitting.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      let request = pending;
      if (!request) request = buildRequest(plan.data!.courseVersion);
      if (userId) {
        saveCheckpointAttempt(userId, request);
        setPendingVersion((v) => v + 1);
      }
      const response = await submitCheckpoint(request, { asUserId: userId ?? undefined });
      // The server answered, so there's nothing left to replay.
      if (userId) {
        clearCheckpointAttempt(userId, targetUnitKey, targetSkillKey);
        setPendingVersion((v) => v + 1);
      }
      setSubmitResult(response);
      if (userId) mergeCardStates(userId, response.cards);
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      queryClient.invalidateQueries({ queryKey: ["lessonsCompleted"] });
      // A checkpoint's reviews count toward today's daily_activity like a lesson's.
      queryClient.invalidateQueries({ queryKey: ["streak"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    } catch (error) {
      // An HTTP answer (a rejection included) settles the attempt; anything
      // else (network, sign-out mid-flight) leaves it saved to replay.
      if (error instanceof ApiError && userId) {
        clearCheckpointAttempt(userId, targetUnitKey, targetSkillKey);
        setPendingVersion((v) => v + 1);
      }
      setSubmitError("Couldn't submit your checkpoint. Check your connection and try again.");
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  // Reloaded (or reopened) with an attempt that never got an answer: send it
  // again rather than make the learner redo the test. A failure leaves it
  // saved and CheckpointPage shows a retry; one automatic try per target.
  const autoResubmitted = useRef<string | null>(null);
  useEffect(() => {
    const target = `${userId}/${targetUnitKey}/${targetSkillKey}`;
    if (!pending || autoResubmitted.current === target) return;
    autoResubmitted.current = target;
    void submit();
    // submit closes over render state; only the pending attempt matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, userId, targetUnitKey, targetSkillKey]);

  return {
    hasPendingAttempt: pending !== null && submitResult === null,
    outdated,
    isLoading: bootstrap.isLoading || plan.isLoading || skillsLoading,
    isError: bootstrap.isError || plan.isError || skillsError,
    courseCode: bootstrap.data?.course?.code ?? null,
    instances,
    current,
    index,
    answerCurrent,
    submit,
    isSubmitting,
    submitError,
    submitResult,
    skippedCount,
    alreadyCompletedCount,
    requiresTest,
  };
}
