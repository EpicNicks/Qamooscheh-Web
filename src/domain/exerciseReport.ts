// What a learner can flag about one exercise from the wrong-answer screen
// (components/lesson/ReportIssue.tsx) — POST /v1/exercise-reports
// (Qamooscheh.Api's ExerciseReportReason, same string values via
// [JsonStringEnumMemberName]).
import type { ExerciseType } from "./enums";

export type ExerciseReportReason = "audio_wrong" | "answer_should_be_accepted" | "other";

export const EXERCISE_REPORT_REASONS: { value: ExerciseReportReason; label: string }[] = [
  { value: "audio_wrong", label: "The audio sounded wrong" },
  { value: "answer_should_be_accepted", label: "The answer should be accepted" },
  { value: "other", label: "Something else went wrong" },
];

/**
 * Everything the Report control sends about the exercise under review.
 * Only the prompt and tags are required; the rest is what triage needs to act
 * without asking the learner (backend 0015_exercise_report_triage.sql), and is
 * left out wherever a screen can't know it.
 */
export interface ExerciseReportContext {
  prompt: string;
  exerciseTags: string[];
  /** What was graded, exactly as submitted. */
  submittedText?: string | null;
  renderType?: ExerciseType | null;
  location?: ExerciseReportLocation | null;
  /** Version-root-relative paths of the takes this exercise actually played. */
  audioFiles?: string[];
}

/** An exercise's identity, the same one POST /v1/sessions/submit uses. */
export interface ExerciseReportLocation {
  courseVersion: number;
  /** Null for a theme lesson, which has no unit. */
  unitKey: string | null;
  skillKey: string;
  exerciseOrdinal: number;
}

/** The parts of a session's queue item a report can cite. unitKey/skillKey/ordinal are there on every engine's item that came from a skill. */
export interface ReportableItem {
  exercise: { prompt: string; tags: string[] };
  renderType: ExerciseType;
  unitKey?: string | null;
  skillKey?: string;
  ordinal?: number;
}

/**
 * The report context for an answered item. The location is included only
 * when it's complete — the backend rejects half a location rather than guess
 * at the rest — and the played takes are de-duplicated, since one recording
 * can be both a prompt's and an answer's.
 */
export function reportContextFor(
  item: ReportableItem,
  submittedText: string,
  courseVersion: number | null,
  playedPaths: (string | null)[],
): ExerciseReportContext {
  const { unitKey, skillKey, ordinal } = item;
  const location =
    courseVersion != null && skillKey && ordinal != null
      ? { courseVersion, unitKey: unitKey ?? null, skillKey, exerciseOrdinal: ordinal }
      : null;
  return {
    prompt: item.exercise.prompt,
    exerciseTags: item.exercise.tags,
    submittedText,
    renderType: item.renderType,
    location,
    audioFiles: [...new Set(playedPaths.filter((p): p is string => !!p))],
  };
}
