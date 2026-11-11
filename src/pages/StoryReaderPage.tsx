import { useCallback, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useBootstrap } from "../hooks/useBootstrap";
import { useExerciseSession } from "../hooks/useExerciseSession";
import { useLexemeIndex, useSkillArtifactsForRefs } from "../hooks/useCourseContent";
import { useRecordings } from "../hooks/useRecordings";
import { useStarredLexemes } from "../hooks/useStarredLexemes";
import { useStoryPlayer } from "../hooks/useStoryPlayer";
import { useAuth } from "../auth/useAuth";
import { flushCompletions, sendCompletion } from "../lib/readerCompletionQueue";
import { savedTagFor } from "../domain/storyWords";
import { storyLines } from "../domain/storyLines";
import { StoryReader } from "../components/story/StoryReader";
import { BackButton } from "../components/common/BackButton";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import type { WordSaving } from "../components/lesson/AnnotatedText";
import type { StoryLine } from "../domain/storyLines";

/**
 * One version of a story, read or listened to from start to finish. Nothing
 * here is graded; playing the audio to its end (or the learner reaching the
 * last line) marks the version read — see lib/readerCompletionQueue.ts.
 * The exercises for the same story live at /story/:unitKey/:skillKey.
 */
export function StoryReaderPage() {
  const { unitKey = "", skillKey = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const course = useBootstrap().data?.course ?? null;
  const session = useExerciseSession<unknown, unknown>(course);
  const lexemeIndex = useLexemeIndex(course);
  const recordings = useRecordings();
  const saved = useStarredLexemes(course?.code);

  const refs = useMemo(() => [{ unitKey, skillKey }], [unitKey, skillKey]);
  const { skills, isLoading, isError } = useSkillArtifactsForRefs(course, refs);
  const artifact = skills.get(`${unitKey}/${skillKey}`) ?? null;
  const lines = useMemo(() => storyLines(artifact?.exercises ?? [], course?.code), [artifact, course?.code]);

  const urls = useMemo(() => lines.map((line) => recordings.phraseUrl(line.audio, line.speaker)), [lines, recordings]);

  const markRead = useCallback(async () => {
    if (!userId || !course) return;
    const sent = await sendCompletion(userId, {
      courseCode: course.code,
      unitKey,
      skillKey,
      occurredAt: new Date().toISOString(),
    });
    // The Journey reads what's finished from bootstrap.
    if (sent) void queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
  }, [userId, course, unitKey, skillKey, queryClient]);

  const player = useStoryPlayer(urls, () => void markRead());

  // Anything an earlier visit couldn't send goes out now.
  useEffect(() => {
    if (!userId) return;
    void flushCompletions(userId).then((anySent) => {
      if (anySent) void queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
    });
  }, [userId, queryClient]);

  const savingFor = useCallback(
    (line: StoryLine): WordSaving => ({
      tagFor: (hint) => savedTagFor(hint, line.tags, lexemeIndex.data),
      isSaved: saved.isStarred,
      toggle: saved.toggle,
    }),
    // saved's functions are rebuilt each render and read the live list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lexemeIndex.data, saved.tags],
  );

  if (isLoading) return <Spinner label="Opening the story…" />;
  if (isError || !artifact) return <ErrorBanner message="Couldn't load this story." />;

  return (
    <>
      <BackButton label="Back" />
      <StoryReader
        title={artifact.title}
        lines={lines}
        player={player}
        courseHintMap={session.courseHintMap}
        textSettings={session.textSettings}
        savingFor={savingFor}
        onReachedEnd={() => void markRead()}
        practise={{ label: "Practise", onPress: () => navigate(`/story/${unitKey}/${skillKey}`) }}
      />
    </>
  );
}
