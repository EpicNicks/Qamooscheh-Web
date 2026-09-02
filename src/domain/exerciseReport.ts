// What a learner can flag about one exercise from the wrong-answer screen
// (components/lesson/ReportIssue.tsx). No backend endpoint exists yet — see
// api/exerciseReport.ts — this just fixes the shape the UI collects so
// wiring the real submission later is a one-line change there.
export type ExerciseReportReason = "audio_wrong" | "answer_should_be_accepted" | "other";

export const EXERCISE_REPORT_REASONS: { value: ExerciseReportReason; label: string }[] = [
  { value: "audio_wrong", label: "The audio sounded wrong" },
  { value: "answer_should_be_accepted", label: "The answer should be accepted" },
  { value: "other", label: "Something else went wrong" },
];

export interface ExerciseReportPayload {
  /** The exercise's own tags (domain/lexemeTag.ts) — cites which lesson part the report is about. */
  exerciseTags: string[];
  prompt: string;
  reasons: ExerciseReportReason[];
  /** Free text, only ever present when "other" is one of the reasons. */
  details: string | null;
}
