import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getStarredPractice } from "../../api/vocab";
import { submitFlashcards } from "../../api/flashcards";
import { useExerciseSession } from "../../hooks/useExerciseSession";
import { refKey, useLexemeIndex, useSkillArtifactsForRefs } from "../../hooks/useCourseContent";
import { buildClozeDeck, clozeResultLines, summarizeCloze, type ClozeResult, type ClozeSource } from "../../domain/cloze";
import { ClozeCard } from "./ClozeCard";
import { SessionProgressBar } from "../lesson/SessionProgressBar";
import { LessonResults } from "../lesson/LessonResults";
import { Spinner } from "../common/Spinner";
import { ErrorBanner } from "../common/ErrorBanner";
import { Button } from "../common/Button";
import type { CourseRef, SkillRef } from "../../types/api";
import styles from "../../pages/FlashcardsPage.module.css";

/** Saved words in one round, at most. */
const ROUND_WORDS = 20;

type XpState = { status: "saving" } | { status: "saved"; xp: number } | { status: "failed" };

interface ClozeRoundProps {
  course: CourseRef;
  /** Hardcore mode: no typo is forgiven. */
  hardcore: boolean;
  onExit: () => void;
}

/**
 * A round of fill-in-the-blank cards (issue #87) over the learner's most-due
 * saved words (GET /v1/vocab/starred/practice picks them, with the lessons'
 * exercises that use each). The sentence for a card is cut from one of those
 * exercises; a word with none is left out, since a cloze round is all cloze
 * cards. The round is submitted once, when it ends, as kind "cloze": the
 * server pays 5/3/1 XP by attempt under a per-word daily cooldown and counts
 * each answer as a review, so the XP shown is whatever it returns.
 */
export function ClozeRound({ course, hardcore, onExit }: ClozeRoundProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  const [results, setResults] = useState<ClozeResult[]>([]);
  const [xp, setXp] = useState<XpState | null>(null);
  const submissionId = useRef(crypto.randomUUID());

  async function finished(result: ClozeResult) {
    const next = [...results, result];
    setResults(next);
    if (!deck || next.length < deck.length) return;

    setXp({ status: "saving" });
    try {
      const response = await submitFlashcards({
        submissionId: submissionId.current,
        courseCode: course.code,
        occurredAt: new Date().toISOString(),
        inRemix: false,
        hardcore,
        cards: next.map((r) => ({ tag: r.tag, kind: "cloze" as const, correct: r.correct, attempt: r.attempt, elapsedMs: r.elapsedMs })),
      });
      setXp({ status: "saved", xp: response.xp });
      // The XP lands in the day's activity, and each answer is a review.
      for (const key of ["activity", "streak", "bootstrap", "sessionPlan"]) queryClient.invalidateQueries({ queryKey: [key] });
      queryClient.invalidateQueries({ queryKey: ["league", "current"] });
    } catch {
      setXp({ status: "failed" });
    }
  }

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

  const current = deck[results.length];
  if (!current) {
    const summary = summarizeCloze(results);
    const correct = results.filter((r) => r.correct).length;
    const lines = clozeResultLines(summary, correct, xp === null || xp.status === "saving" ? null : xp.status === "saved" ? xp.xp : undefined);
    return (
      <div className={styles.done}>
        <h1>Round complete!</h1>
        <LessonResults correct={correct} total={results.length} sound="lessonPassed" />
        <p className={styles.note}>{lines.breakdown}</p>
        <p className={styles.note} role="status">
          {lines.xp}
        </p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => navigate("/vocabulary")}>
            Back to vocabulary
          </Button>
          <Button variant="secondary" onClick={onExit}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <SessionProgressBar completed={results.length} total={deck.length} />
      <ClozeCard key={current.tag} card={current} courseCode={course.code} session={session} hardcore={hardcore} onFinished={finished} />
    </div>
  );
}
