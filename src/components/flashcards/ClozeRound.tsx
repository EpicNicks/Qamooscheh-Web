import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getStarredPractice } from "../../api/vocab";
import { useExerciseSession } from "../../hooks/useExerciseSession";
import { refKey, useLexemeIndex, useSkillArtifactsForRefs } from "../../hooks/useCourseContent";
import { buildClozeDeck, type ClozeSource } from "../../domain/cloze";
import { ClozeDeckRound } from "./ClozeDeckRound";
import { Spinner } from "../common/Spinner";
import { ErrorBanner } from "../common/ErrorBanner";
import { Button } from "../common/Button";
import type { CourseRef, SkillRef } from "../../types/api";
import styles from "../../pages/FlashcardsPage.module.css";

/** Saved words in one round, at most. */
const ROUND_WORDS = 20;

interface ClozeRoundProps {
  course: CourseRef;
  /** Hardcore mode: no typo is forgiven. */
  hardcore: boolean;
  onExit: () => void;
}

/**
 * The standalone fill-in-the-blank round (issue #87) over the learner's
 * most-due saved words (GET /v1/vocab/starred/practice picks them, with the
 * lessons' exercises that use each). The sentence for a card is cut from one
 * of those exercises; a word with none is left out, since a cloze round is
 * all cloze cards. The round itself is ClozeDeckRound, shared with a
 * Repack's cloze contents.
 */
export function ClozeRound({ course, hardcore, onExit }: ClozeRoundProps) {
  const navigate = useNavigate();
  const session = useExerciseSession<unknown, unknown>(course);
  const lexemeIndex = useLexemeIndex(course);
  const practice = useQuery({
    queryKey: ["vocab", "cloze-practice"],
    queryFn: () => getStarredPractice(ROUND_WORDS),
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
  const deck = useMemo(() => {
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

  if (practice.isError || lexemeIndex.isError || content.isError) return <ErrorBanner message="Couldn't put together your fill-in-the-blank round." />;
  if (deck === null) return <Spinner label="Finding sentences for your saved words…" />;

  if (deck.length === 0) {
    return (
      <div className={styles.done}>
        <h1>Nothing to fill in yet</h1>
        <p>Fill-in-the-blank cards use sentences from Parsles you've done, with a word you've saved taken out. Save a few words you've met and come back.</p>
        <Button onClick={onExit}>Back</Button>
      </div>
    );
  }

  return (
    <ClozeDeckRound
      course={course}
      deck={deck}
      hardcore={hardcore}
      inRemix={false}
      exitLabel="Done"
      onExit={onExit}
      secondaryExit={{ label: "Back to vocabulary", onExit: () => navigate("/vocabulary") }}
    />
  );
}
