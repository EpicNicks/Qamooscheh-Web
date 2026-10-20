import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useBootstrap } from "../hooks/useBootstrap";
import { useLexemeIndex } from "../hooks/useCourseContent";
import { useStarredLexemes } from "../hooks/useStarredLexemes";
import { flashcardWords, type FlashcardWord } from "../domain/flashcards";
import { submitFlashcards } from "../api/flashcards";
import { ClozeRound } from "../components/flashcards/ClozeRound";
import { Flashcard } from "../components/flashcards/Flashcard";
import { SessionProgressBar } from "../components/lesson/SessionProgressBar";
import { LessonResults } from "../components/lesson/LessonResults";
import { SegmentedToggle } from "../components/common/SegmentedToggle";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Button } from "../components/common/Button";
import type { FlashcardKind } from "../types/api";
import styles from "./FlashcardsPage.module.css";

/** Cards in one round, at most. */
const ROUND_SIZE = 20;

type XpState = { status: "idle" } | { status: "saving" } | { status: "saved"; xp: number } | { status: "failed" };

/**
 * Saved words as flashcards (issue #23), outside any lesson. Two modes:
 * "Flip" (self-rated) earns nothing on its own — a flip only earns XP inside
 * a saved-words Repack — and "Type" (translation) earns 5 XP per right
 * meaning, submitted once when the round ends. Neither touches review
 * scheduling. "Fill in the blank" (issue #87) is a cloze round of its own
 * (ClozeRound): sentences from Parsles with a saved word taken out, which
 * the server counts as reviews.
 */
export function FlashcardsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const bootstrap = useBootstrap();
  const course = bootstrap.data?.course ?? null;
  const lexemeIndex = useLexemeIndex(course);
  const saved = useStarredLexemes(course?.code);

  const [kind, setKind] = useState<FlashcardKind>("translation");
  const [hardcore, setHardcore] = useState(false);
  const [clozeStarted, setClozeStarted] = useState(false);
  const [deck, setDeck] = useState<FlashcardWord[] | null>(null);
  const [results, setResults] = useState<{ tag: string; correct: boolean }[]>([]);
  const [xp, setXp] = useState<XpState>({ status: "idle" });
  const submissionId = useRef<string>("");

  if (bootstrap.isLoading || lexemeIndex.isLoading) return <Spinner label="Loading your saved words…" />;
  if (bootstrap.isError || lexemeIndex.isError) return <ErrorBanner message="Couldn't load your saved words." />;

  const words = flashcardWords(saved.tags, lexemeIndex.data);

  function start() {
    const shuffled = [...words];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    submissionId.current = crypto.randomUUID();
    setResults([]);
    setXp({ status: "idle" });
    setDeck(shuffled.slice(0, ROUND_SIZE));
  }

  async function answer(word: FlashcardWord, correct: boolean) {
    const next = [...results, { tag: word.tag, correct }];
    setResults(next);
    if (!deck || next.length < deck.length || kind !== "translation" || !course) return;

    // A flip round earns nothing standalone, so only a typed round is sent.
    setXp({ status: "saving" });
    try {
      const response = await submitFlashcards({
        submissionId: submissionId.current,
        courseCode: course.code,
        occurredAt: new Date().toISOString(),
        inRemix: false,
        cards: next.map((r) => ({ ...r, kind })),
      });
      setXp({ status: "saved", xp: response.xp });
      // XP lands in the day's activity, which is what the streak, goal and league read.
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      queryClient.invalidateQueries({ queryKey: ["league", "current"] });
      queryClient.invalidateQueries({ queryKey: ["streak"] });
    } catch {
      setXp({ status: "failed" });
    }
  }

  if (clozeStarted && course) {
    return <ClozeRound course={course} hardcore={hardcore} onExit={() => setClozeStarted(false)} />;
  }

  if (deck === null || words.length === 0) {
    return (
      <div className={styles.wrap}>
        <div className={styles.header}>
          <h1 className={styles.title}>Flashcards</h1>
          <Button variant="secondary" onClick={() => navigate("/vocabulary")}>
            Back to vocabulary
          </Button>
        </div>
        {words.length === 0 ? (
          <p>
            You haven't saved any words from this course yet. Save words with the ★ on the vocabulary list, or after an
            answer in a Parsle.
          </p>
        ) : (
          <>
            <SegmentedToggle
              options={[
                { value: "translation" as const, label: "Type the meaning" },
                { value: "self_rated" as const, label: "Flip cards" },
                { value: "cloze" as const, label: "Fill in the blank" },
              ]}
              value={kind}
              onChange={setKind}
            />
            <p className={styles.note}>
              {kind === "translation"
                ? "Each meaning you get right earns 5 XP."
                : kind === "cloze"
                  ? "A saved word is taken out of a sentence from a Parsle you've done, with its meaning in the gap. Type the word: 5 XP on the first try, 3 on the second, 1 on the third. A word pays less if you've practised it a lot today, and each answer counts as a review."
                  : "Flipping cards is practice only. It earns XP inside a saved-words Repack."}{" "}
              {kind !== "cloze" && "Flashcards don't change your review schedule."}
            </p>
            {kind === "cloze" && (
              <label className={styles.note}>
                <input type="checkbox" checked={hardcore} onChange={(event) => setHardcore(event.target.checked)} /> Hardcore: no typos
                forgiven (otherwise one wrong letter in a word of four or more is let through)
              </label>
            )}
            {kind === "cloze" ? (
              <div className={styles.actions}>
                <Button onClick={() => setClozeStarted(true)}>Start</Button>
                <Button variant="secondary" onClick={() => navigate("/race")}>
                  Race the clock
                </Button>
              </div>
            ) : (
              <Button onClick={start}>
                Start {Math.min(words.length, ROUND_SIZE)} card{Math.min(words.length, ROUND_SIZE) === 1 ? "" : "s"}
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  const current = deck[results.length];
  if (!current) {
    const correct = results.filter((r) => r.correct).length;
    return (
      <div className={styles.done}>
        <h1>Round complete!</h1>
        <LessonResults correct={correct} total={results.length} sound="lessonPassed" />
        {kind === "translation" && (
          <p className={styles.note}>
            {xp.status === "saving" && "Saving your XP…"}
            {xp.status === "saved" &&
              (xp.xp > 0 ? `+${xp.xp} XP` : correct > 0 ? "You've earned today's flashcard XP already." : "No XP this round.")}
            {xp.status === "failed" && "Couldn't save this round's XP."}
          </p>
        )}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => navigate("/vocabulary")}>
            Back to vocabulary
          </Button>
          <Button onClick={start}>Another round</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <SessionProgressBar completed={results.length} total={deck.length} />
      <Flashcard key={`${current.tag}-${results.length}`} word={current} courseCode={course?.code ?? null} kind={kind} onAnswered={(correct) => answer(current, correct)} />
    </div>
  );
}
