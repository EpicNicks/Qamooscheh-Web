// The placement-test/"gauntlet" flow (API_SPEC.md §2.7): sample exercises
// from every skill between the learner's cursor and a target, answer them in
// one sitting, submit once. No client-only retry queue here — unlike an
// ordinary lesson (§2.5), a checkpoint is one attempt at one target; a wrong
// answer is just a wrong answer, not something to requeue for a second try.
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCheckpointPlan, submitCheckpoint } from "../api/checkpoint";
import { useSkillArtifactsForRefs } from "./useCourseContent";
import { useBootstrap } from "./useBootstrap";
import { useAuth } from "../auth/useAuth";
import { loadCardStates, mergeCardStates } from "../lib/cardStateStore";
import { resolveExerciseType } from "../domain/exerciseResolution";
import type { CheckpointSkillAnswers, CheckpointSubmitResponse, SubmittedItem } from "../types/api";
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
    const result: CheckpointExerciseInstance[] = [];
    for (const skillPlan of plan.data.skills) {
      const artifact = skillArtifacts.get(`${skillPlan.unitKey}/${skillPlan.skillKey}`);
      if (!artifact) return [];
      for (const ordinal of skillPlan.exerciseOrdinals) {
        const exercise = artifact.exercises[ordinal];
        if (!exercise) continue;
        result.push({
          key: `${skillPlan.unitKey}/${skillPlan.skillKey}/${ordinal}`,
          unitKey: skillPlan.unitKey,
          skillKey: skillPlan.skillKey,
          ordinal,
          exercise,
          renderType: resolveExerciseType(exercise, localCards[exercise.tags[0]] ?? null),
        });
      }
    }
    return result;
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

  function answerCurrent(text: string) {
    if (!current) return;
    setAnswers((prev) => new Map(prev).set(current.key, text));
    // Always advance, even past the last question — `current` becoming null
    // is what drives CheckpointPage's "ready to submit" screen.
    setIndex((i) => i + 1);
  }

  async function submit() {
    if (!plan.data) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
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

      const response = await submitCheckpoint({
        submissionId: crypto.randomUUID(),
        targetUnitKey,
        targetSkillKey,
        courseVersion: plan.data.courseVersion,
        occurredAt: new Date().toISOString(),
        skills,
      });

      setSubmitResult(response);
      if (userId) mergeCardStates(userId, response.cards);
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
    } catch {
      setSubmitError("Couldn't submit your checkpoint. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
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
  };
}
