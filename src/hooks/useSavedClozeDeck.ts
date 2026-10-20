import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStarredPractice } from "../api/vocab";
import { useExerciseSession } from "./useExerciseSession";
import { refKey, useLexemeIndex, useSkillArtifactsForRefs } from "./useCourseContent";
import { buildClozeDeck, type ClozeCard, type ClozeSource } from "../domain/cloze";
import type { CourseRef, SkillRef } from "../types/api";

/**
 * The fill-in-the-blank deck for the learner's most-due saved words:
 * GET /v1/vocab/starred/practice picks up to [words] of them, with the
 * lessons' exercises that use each, and a card's sentence is cut from one of
 * those. A word with no usable sentence is left out, since a cloze round is
 * all cloze cards. `deck` is null until it is built (never empty after: an
 * empty array means nothing could be cut). Shared by the standalone round
 * (ClozeRound) and the Repack race. The session is returned for the card's
 * render preferences.
 */
export function useSavedClozeDeck(course: CourseRef, words: number, queryKey: string) {
  const session = useExerciseSession<unknown, unknown>(course);
  const lexemeIndex = useLexemeIndex(course);
  const practice = useQuery({
    queryKey: ["vocab", queryKey],
    queryFn: () => getStarredPractice(words),
    // Picked fresh each round, and not again mid-round.
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const refs = useMemo<SkillRef[]>(() => {
    const byKey = new Map<string, SkillRef>();
    for (const word of practice.data?.words ?? []) {
      for (const { unitKey, skillKey } of word.exercises) byKey.set(refKey({ unitKey, skillKey }), { unitKey, skillKey });
    }
    return [...byKey.values()];
  }, [practice.data]);
  const content = useSkillArtifactsForRefs(course, refs);

  // Which of a word's sentences each card uses, fixed for the round.
  const [seed] = useState(() => Math.random());

  const ready = practice.data != null && lexemeIndex.data != null && refs.every((ref) => content.skills.has(refKey(ref)));
  const deck = useMemo<ClozeCard[] | null>(() => {
    if (!ready) return null;
    const sources: ClozeSource[] = practice.data!.words.map((word) => ({
      tag: word.tag,
      exercises: word.exercises.flatMap(({ unitKey, skillKey, ordinal }) => {
        const exercise = content.skills.get(refKey({ unitKey, skillKey }))?.exercises[ordinal];
        return exercise ? [exercise] : [];
      }),
    }));
    return buildClozeDeck(sources, session.courseHintMap, lexemeIndex.data!, (count) => Math.floor(seed * count));
  }, [ready, practice.data, content.skills, lexemeIndex.data, session.courseHintMap, seed]);

  return { deck, session, isError: practice.isError || lexemeIndex.isError || content.isError };
}
