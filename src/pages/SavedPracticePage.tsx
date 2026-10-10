import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/useAuth";
import { useBootstrap } from "../hooks/useBootstrap";
import { useLexemeIndex, useSkillArtifactsForRefs, refKey } from "../hooks/useCourseContent";
import { useExerciseSession } from "../hooks/useExerciseSession";
import { getStarredPractice } from "../api/vocab";
import { submitFlashcards } from "../api/flashcards";
import { checkAnswer, type AnswerVerdict } from "../domain/answerFeedback";
import { resolveExerciseType } from "../domain/exerciseResolution";
import { flashcardWords, type FlashcardWord } from "../domain/flashcards";
import { xpForAnswer } from "../domain/xp";
import {
  includesExercise,
  includesFlashcards,
  initialRemixContents,
  remixContentsOptions,
  type RemixContents,
} from "../domain/remixContents";
import { useLocalAppPref } from "../hooks/useLocalAppPref";
import { RemixContentsPicker } from "../components/lesson/RemixContentsPicker";
import { loadCardStates } from "../lib/cardStateStore";
import { submitRecordedAnswers, type RecordedAnswer, type SubmitOutcome } from "../lib/submitRecordedAnswers";
import { ExerciseSessionScreen, type ExerciseSessionFeedback, type ExerciseSessionItem } from "../components/lesson/ExerciseSessionScreen";
import { SessionProgressBar } from "../components/lesson/SessionProgressBar";
import { LessonResults } from "../components/lesson/LessonResults";
import { Flashcard } from "../components/flashcards/Flashcard";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Button } from "../components/common/Button";
import type { SkillRef } from "../types/api";
import styles from "./LessonPage.module.css";

/** How many saved words one remix covers. Each brings a flashcard and up to two exercises. */
const PRACTICE_WORDS = 10;

interface RemixExercise extends ExerciseSessionItem {
  kind: "exercise";
  unitKey: string;
  skillKey: string;
  ordinal: number;
}

interface RemixCard {
  kind: "flashcard";
  key: string;
  word: FlashcardWord;
}

type RemixItem = RemixExercise | RemixCard;

interface RemixFeedback extends ExerciseSessionFeedback {
  verdict: AnswerVerdict;
  usedHint: boolean;
}

interface Outcome {
  lessons: SubmitOutcome;
  /** Flashcard XP the server awarded, or null when the round couldn't be saved. */
  flashcardXp: number | null;
}

/**
 * The saved-words remix (issue #23): the learner's most-due saved words, each
 * as a self-rated flashcard followed by exercises from lessons they've done
 * that use it (GET /v1/vocab/starred/practice picks both). The exercises are
 * graded and submitted like any lesson's — they move review scheduling and
 * earn lesson XP — and the flashcards earn flashcard XP, since they were
 * flipped inside a remix.
 */
export function SavedPracticePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const bootstrap = useBootstrap();
  const course = bootstrap.data?.course ?? null;
  const lexemeIndex = useLexemeIndex(course);
  const practice = useQuery({
    queryKey: ["vocab", "practice"],
    queryFn: () => getStarredPractice(PRACTICE_WORDS),
    enabled: bootstrap.isSuccess,
    // Picked fresh each visit: which words are most due changes with every session.
    gcTime: 0,
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

  const session = useExerciseSession<RemixExercise, RemixFeedback>(course);
  const { confirmation } = session;

  const [queue, setQueue] = useState<RemixItem[] | null>(null);
  const [position, setPosition] = useState(0);
  const [answers, setAnswers] = useState<RecordedAnswer[]>([]);
  const [cards, setCards] = useState<{ tag: string; correct: boolean }[]>([]);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [status, setStatus] = useState<"running" | "submitting" | "done">("running");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const shownAt = useRef(0);

  const ready =
    practice.data != null && lexemeIndex.data != null && userId != null && refs.every((ref) => content.skills.has(refKey(ref)));

  // Everything the picked words bring, before the learner's contents choice
  // (issue #45) narrows it.
  const built = useMemo<RemixItem[] | null>(() => {
    if (!ready) return null;
    const cardStates = loadCardStates(userId!);
    const items: RemixItem[] = [];
    const seen = new Set<string>();
    for (const word of practice.data!.words) {
      const [card] = flashcardWords([word.tag], lexemeIndex.data);
      if (card) items.push({ kind: "flashcard", key: `card/${word.tag}`, word: card });
      for (const { unitKey, skillKey, ordinal } of word.exercises) {
        const key = `${unitKey}/${skillKey}/${ordinal}`;
        const exercise = content.skills.get(refKey({ unitKey, skillKey }))?.exercises[ordinal];
        if (seen.has(key) || !exercise) continue;
        seen.add(key);
        const primaryTag = exercise.tags[0];
        items.push({
          kind: "exercise",
          key,
          unitKey,
          skillKey,
          ordinal,
          exercise,
          renderType: resolveExerciseType(exercise, (primaryTag ? cardStates[primaryTag] : null) ?? null),
        });
      }
    }
    return items;
  }, [ready, practice.data, lexemeIndex.data, content.skills, userId]);

  const [rememberedContents, setRememberedContents] = useLocalAppPref("remixContents", { lesson: "all", saved: "flashcards_and_all" });
  const contentsOptions = remixContentsOptions(built?.some((item) => item.kind === "flashcard") ?? false);
  const [chosenContents, setChosenContents] = useState<RemixContents | null>(null);
  const [choiceEmpty, setChoiceEmpty] = useState(false);
  const shownContents = chosenContents ?? initialRemixContents(rememberedContents.saved, contentsOptions, "all");

  function filtered(items: readonly RemixItem[], contents: RemixContents): RemixItem[] {
    return items.filter((item) =>
      item.kind === "flashcard" ? includesFlashcards(contents) : includesExercise(contents, item.renderType),
    );
  }

  function start() {
    if (!built) return;
    const items = filtered(built, shownContents);
    if (items.length === 0) {
      setChoiceEmpty(true);
      return;
    }
    setRememberedContents({ ...rememberedContents, saved: shownContents });
    // Built once — a background refetch must not rebuild it mid-run (the
    // same lazy seeding useLessonEngine does).
    setQueue(items);
  }

  const current = queue?.[position] ?? null;
  const isReviewing = confirmation.answeredItem !== null;

  // Latency is answering time only — the clock restarts when an exercise
  // actually comes on screen, not while the last answer's feedback is up.
  useEffect(() => {
    if (!isReviewing) shownAt.current = performance.now();
  }, [isReviewing, position]);

  async function finish(finalAnswers: RecordedAnswer[], finalCards: { tag: string; correct: boolean }[]) {
    if (!course || !userId || !practice.data) return;
    setStatus("submitting");

    const lessons = await submitRecordedAnswers({
      userId,
      courseCode: course.code,
      courseVersion: practice.data.courseVersion,
      answers: finalAnswers,
    });

    let flashcardXp: number | null = 0;
    if (finalCards.length > 0) {
      try {
        const response = await submitFlashcards({
          submissionId: crypto.randomUUID(),
          courseCode: course.code,
          occurredAt: new Date().toISOString(),
          inRemix: true,
          cards: finalCards.map((card) => ({ ...card, kind: "self_rated" as const })),
        });
        flashcardXp = response.xp;
      } catch {
        flashcardXp = null;
      }
    }

    queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
    queryClient.invalidateQueries({ queryKey: ["sessionPlan"] });
    queryClient.invalidateQueries({ queryKey: ["activity"] });
    queryClient.invalidateQueries({ queryKey: ["league", "current"] });
    queryClient.invalidateQueries({ queryKey: ["streak"] });
    setOutcome({ lessons, flashcardXp });
    setStatus("done");
  }

  function advance(nextAnswers: RecordedAnswer[], nextCards: { tag: string; correct: boolean }[]) {
    const next = position + 1;
    setPosition(next);
    if (queue && next >= queue.length) void finish(nextAnswers, nextCards);
  }

  function answerCard(word: FlashcardWord, correct: boolean) {
    const nextCards = [...cards, { tag: word.tag, correct }];
    setCards(nextCards);
    advance(answers, nextCards);
  }

  function answerExercise(item: RemixExercise, submittedText: string, opts?: { usedHint?: boolean }) {
    const feedback = checkAnswer(course?.code, item.exercise, submittedText);
    const correct = feedback.verdict !== "incorrect";
    if (correct) setFirstTryCorrect((n) => n + 1);
    const usedHint = opts?.usedHint ?? false;
    const latencyMs = Math.round(performance.now() - shownAt.current);
    const nextAnswers = [
      ...answers,
      ...item.exercise.tags.map(
        (lexemeTag): RecordedAnswer => ({
          unitKey: item.unitKey,
          skillKey: item.skillKey,
          item: {
            exerciseOrdinal: item.ordinal,
            lexemeTag,
            exerciseType: item.renderType,
            scriptMode: item.exercise.scriptMode,
            submittedText,
            usedHint,
            latencyMs,
            attempt: 1,
          },
        }),
      ),
    ];
    setAnswers(nextAnswers);
    confirmation.record(item, { correct, note: feedback.note, submittedText, verdict: feedback.verdict, usedHint });
    advance(nextAnswers, cards);
  }

  const progress = { completed: position, total: queue?.length ?? 0 };

  // The last answer's review outranks everything else, as on LessonPage.
  if (isReviewing) {
    return (
      <ExerciseSessionScreen
        session={session}
        courseCode={course?.code ?? null}
        progress={progress}
        current={null}
        onSubmit={() => {}}
        feedbackXp={(feedback) => xpForAnswer(feedback.verdict, 1, feedback.usedHint)}
      />
    );
  }

  if (practice.isError || bootstrap.isError || lexemeIndex.isError || content.isError) {
    return <ErrorBanner message="Couldn't put together your saved-words practice." />;
  }

  if (built === null) return <Spinner label="Gathering your saved words…" />;

  if (built.length === 0) {
    return (
      <div className={styles.done}>
        <h1>Nothing to practise yet</h1>
        <p>Save words from this course — with the ★ on the vocabulary list, or after an answer in a lesson — and they'll show up here.</p>
        <Button onClick={() => navigate("/vocabulary")}>Back to vocabulary</Button>
      </div>
    );
  }

  if (queue === null) {
    return (
      <RemixContentsPicker
        options={contentsOptions}
        value={shownContents}
        onChange={(next) => {
          setChosenContents(next);
          setChoiceEmpty(false);
        }}
        onStart={start}
        emptyMessage={choiceEmpty ? "Your saved words have none of those right now — pick something else." : null}
        backLabel="Back to vocabulary"
        onBack={() => navigate("/vocabulary")}
      />
    );
  }

  if (status === "submitting") return <Spinner label="Saving your progress…" />;

  if (status === "done" && outcome) {
    const exerciseCount = queue.filter((item) => item.kind === "exercise").length;
    const knownCards = cards.filter((card) => card.correct).length;
    return (
      <div className={styles.done}>
        <h1>Saved words practised!</h1>
        {exerciseCount > 0 && <LessonResults correct={firstTryCorrect} total={exerciseCount} sound="lessonPassed" />}
        {cards.length > 0 && (
          <p className={styles.practiceNote}>
            You knew {knownCards} of {cards.length} flashcard{cards.length === 1 ? "" : "s"}
            {outcome.flashcardXp != null && outcome.flashcardXp > 0 && ` (+${outcome.flashcardXp} XP)`}.
            {outcome.flashcardXp === null && " Couldn't save the flashcards' XP."}
          </p>
        )}
        {outcome.lessons === "queued" && <p className={styles.practiceNote}>Your answers will sync when you're back online.</p>}
        {outcome.lessons === "rejected" && <p className={styles.practiceNote}>Some answers weren't saved — your course may have been updated.</p>}
        <div className={styles.doneActions}>
          <Button variant="secondary" onClick={() => navigate("/vocabulary")}>
            Back to vocabulary
          </Button>
          <Button onClick={() => navigate("/path")}>Back to path</Button>
        </div>
      </div>
    );
  }

  if (current?.kind === "flashcard") {
    return (
      <div className={styles.remixCard}>
        <SessionProgressBar completed={progress.completed} total={progress.total} />
        <Flashcard
          key={current.key}
          word={current.word}
          courseCode={course?.code ?? null}
          kind="self_rated"
          onAnswered={(correct) => answerCard(current.word, correct)}
        />
      </div>
    );
  }

  return (
    <ExerciseSessionScreen
      session={session}
      courseCode={course?.code ?? null}
      progress={progress}
      current={current}
      onSubmit={(text, opts) => current && answerExercise(current, text, opts)}
      feedbackXp={(feedback) => xpForAnswer(feedback.verdict, 1, feedback.usedHint)}
    />
  );
}
