import { useState, type FormEvent } from "react";
import { Button } from "../common/Button";
import { DirectionalText } from "../common/DirectionalText";
import { WordAudioButton } from "../vocabulary/WordAudioButton";
import { gradeTranslation, type FlashcardWord } from "../../domain/flashcards";
import type { FlashcardKind } from "../../types/api";
import styles from "./Flashcard.module.css";

interface FlashcardProps {
  word: FlashcardWord;
  courseCode: string | null;
  kind: FlashcardKind;
  /** Called once, when the learner moves past the card: whether they knew it (self-rated) or typed a right meaning (translation). */
  onAnswered: (correct: boolean) => void;
}

/**
 * One saved word as a flashcard. Self-rated: flip it to see the meaning, then
 * say whether you knew it. Translation: type the meaning, graded on the device
 * (domain/flashcards.ts), then continue. Key it by tag so a new card starts
 * face down.
 */
export function Flashcard({ word, courseCode, kind, onAnswered }: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);
  const [typed, setTyped] = useState("");
  const [graded, setGraded] = useState<boolean | null>(null);

  function check(event: FormEvent) {
    event.preventDefault();
    if (graded !== null) {
      onAnswered(graded);
      return;
    }
    if (!typed.trim()) return;
    setGraded(gradeTranslation(typed, word.entry.gloss));
    setFlipped(true);
  }

  return (
    <div className={styles.card}>
      <div className={styles.front}>
        {/* The size goes on a wrapper: DirectionalText sets its own font-size,
            the learner's per-script scale, as a percentage of its parent's. */}
        <span className={styles.word}>
          <DirectionalText courseCode={courseCode}>{word.surface}</DirectionalText>
        </span>
        <WordAudioButton surface={word.surface} audio={word.entry.audio} />
      </div>

      {flipped && (
        <div className={styles.back}>
          <span className={styles.gloss}>{word.entry.gloss}</span>
          {word.entry.romanization && <span className={styles.romanization}>{word.entry.romanization}</span>}
        </div>
      )}

      {kind === "self_rated" ? (
        flipped ? (
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => onAnswered(false)}>
              Didn't know
            </Button>
            <Button onClick={() => onAnswered(true)}>Knew it</Button>
          </div>
        ) : (
          <div className={styles.actions}>
            <Button onClick={() => setFlipped(true)}>Show meaning</Button>
          </div>
        )
      ) : (
        <form className={styles.form} onSubmit={check}>
          <input
            className={styles.input}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder="Type the meaning in English"
            aria-label="Meaning in English"
            disabled={graded !== null}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          {graded !== null && (
            <span className={graded ? styles.right : styles.wrong} role="status">
              {graded ? "Correct!" : "Not quite."}
            </span>
          )}
          <Button type="submit" disabled={graded === null && !typed.trim()}>
            {graded === null ? "Check" : "Continue"}
          </Button>
        </form>
      )}
    </div>
  );
}
