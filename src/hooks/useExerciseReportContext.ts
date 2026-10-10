// The Report control's context for the exercise under review — what
// domain/exerciseReport.ts's reportContextFor needs that only hooks can
// supply: the pinned course version the exercises were fetched from, and
// which take of each recording this learner was actually played.
import { useBootstrap } from "./useBootstrap";
import { useRecordings } from "./useRecordings";
import { reportContextFor, type ExerciseReportContext, type ReportableItem } from "../domain/exerciseReport";
import { shownAnswerVariant, variantAudio } from "../domain/answerVariants";
import type { ExerciseArtifact } from "../types/content";

type Item = ReportableItem & {
  exercise: ReportableItem["exercise"] &
    Pick<ExerciseArtifact, "type" | "tiles" | "answer" | "alternativeAnswers" | "promptAudio" | "answerAudio" | "answerVariantAudio" | "speaker">;
};

/** A null submittedText is an exercise not yet answered: no submission to cite, and no answer take played yet. */
export function useExerciseReportContext(item: Item | null, submittedText: string | null): ExerciseReportContext | null {
  const courseVersion = useBootstrap().data?.course?.version ?? null;
  const recordings = useRecordings(item?.exercise ?? null);
  if (!item) return null;
  const { promptAudio, speaker } = item.exercise;
  const promptPath = recordings.phrasePath(promptAudio, speaker);
  if (submittedText == null) return reportContextFor(item, null, courseVersion, [promptPath]);
  // The take cited is the one played for the variant shown.
  const answerAudio = variantAudio(item.exercise, shownAnswerVariant(item.exercise, submittedText).index);
  return reportContextFor(item, submittedText, courseVersion, [promptPath, recordings.phrasePath(answerAudio, speaker)]);
}
