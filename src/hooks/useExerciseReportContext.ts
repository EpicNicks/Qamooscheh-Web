// The Report control's context for the exercise under review — what
// domain/exerciseReport.ts's reportContextFor needs that only hooks can
// supply: the pinned course version the exercises were fetched from, and
// which take of each recording this learner was actually played.
import { useBootstrap } from "./useBootstrap";
import { useRecordings } from "./useRecordings";
import { reportContextFor, type ExerciseReportContext, type ReportableItem } from "../domain/exerciseReport";
import type { AudioMap } from "../types/content";

type Item = ReportableItem & {
  exercise: ReportableItem["exercise"] & { prompt: string; answer: readonly string[]; promptAudio?: AudioMap | null; answerAudio?: AudioMap | null; speaker?: string | null };
};

export function useExerciseReportContext(item: Item | null, submittedText: string | null): ExerciseReportContext | null {
  const courseVersion = useBootstrap().data?.course?.version ?? null;
  const recordings = useRecordings(item?.exercise ?? null);
  if (!item || submittedText == null) return null;
  const { promptAudio, answerAudio, speaker } = item.exercise;
  return reportContextFor(item, submittedText, courseVersion, [
    recordings.phrasePath(promptAudio, speaker),
    recordings.phrasePath(answerAudio, speaker),
  ]);
}
