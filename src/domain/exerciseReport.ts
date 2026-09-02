// What a learner can flag about one exercise from the wrong-answer screen
// (components/lesson/ReportIssue.tsx) — POST /v1/exercise-reports
// (Qamooscheh.Api's ExerciseReportReason, same string values via
// [JsonStringEnumMemberName]).
export type ExerciseReportReason = "audio_wrong" | "answer_should_be_accepted" | "other";

export const EXERCISE_REPORT_REASONS: { value: ExerciseReportReason; label: string }[] = [
  { value: "audio_wrong", label: "The audio sounded wrong" },
  { value: "answer_should_be_accepted", label: "The answer should be accepted" },
  { value: "other", label: "Something else went wrong" },
];
