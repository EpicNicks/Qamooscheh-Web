import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { submitFlashcardsDurably } from "../../api/flashcards";
import { useAuth } from "../../auth/useAuth";
import { useExerciseSession } from "../../hooks/useExerciseSession";
import { clozeResultLines, summarizeCloze, type ClozeCard as ClozeCardData, type ClozeResult } from "../../domain/cloze";
import { ClozeCard } from "./ClozeCard";
import { SessionProgressBar } from "../lesson/SessionProgressBar";
import { LessonResults } from "../lesson/LessonResults";
import { Button } from "../common/Button";
import type { CourseRef } from "../../types/api";
import styles from "../../pages/FlashcardsPage.module.css";

type XpState = { status: "saving" } | { status: "saved"; xp: number } | { status: "failed" };

interface ClozeDeckRoundProps {
  course: CourseRef;
  /** The cards of the round, already built (never empty). */
  deck: readonly ClozeCardData[];
  /** Hardcore mode: no typo is forgiven. */
  hardcore: boolean;
  /** True inside a Repack (issue #105); the server ignores it for cloze, whose rules are the same either way. */
  inRemix: boolean;
  /** Label and action for the result screen's main button. */
  exitLabel: string;
  onExit: () => void;
  /** An optional second way out of the result screen. */
  secondaryExit?: { label: string; onExit: () => void };
}

/**
 * A round of fill-in-the-blank cards (issue #87) over a deck that is already
 * built: the standalone round (ClozeRound) and a Repack's cloze contents
 * (issue #105) run exactly the same cards under exactly the same rules. The
 * round is submitted once, when it ends, as kind "cloze": the server pays
 * 5/3/1 XP by attempt under a per-word daily cooldown and counts each answer
 * as a review, so the XP shown is whatever it returns.
 */
export function ClozeDeckRound({ course, deck, hardcore, inRemix, exitLabel, onExit, secondaryExit }: ClozeDeckRoundProps) {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const session = useExerciseSession<unknown, unknown>(course);
  const [results, setResults] = useState<ClozeResult[]>([]);
  const [xp, setXp] = useState<XpState | null>(null);
  const submissionId = useRef(crypto.randomUUID());

  async function finished(result: ClozeResult) {
    const next = [...results, result];
    setResults(next);
    if (next.length < deck.length) return;
    if (!userId) {
      setXp({ status: "failed" });
      return;
    }

    setXp({ status: "saving" });
    try {
      const response = await submitFlashcardsDurably(userId, {
        submissionId: submissionId.current,
        courseCode: course.code,
        occurredAt: new Date().toISOString(),
        inRemix,
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
          {secondaryExit && (
            <Button variant="secondary" onClick={secondaryExit.onExit}>
              {secondaryExit.label}
            </Button>
          )}
          <Button variant="secondary" onClick={onExit}>
            {exitLabel}
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
