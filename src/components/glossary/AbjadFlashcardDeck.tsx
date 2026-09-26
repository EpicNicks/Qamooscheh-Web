import { useMemo, useState, type KeyboardEvent } from "react";
import { abjadFlashcards, letterInForm, type AbjadLetter, type LetterForm } from "../../domain/persian/abjad";
import { Button } from "../common/Button";
import { DirectionalText } from "../common/DirectionalText";
import { FlipIcon } from "../common/icons";
import styles from "./AbjadFlashcardDeck.module.css";

interface AbjadFlashcardDeckProps {
  /** The letters to drill — the whole alphabet, or whatever the page's search narrowed it to. */
  letters: ReadonlyArray<AbjadLetter>;
  form: LetterForm;
  courseCode: string | null | undefined;
}

function shuffled(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * A self-study deck over domain/persian/abjad.ts's flashcards: the letter on
 * the front, its sound and its name (romanized and native, side by side) on
 * the back. Purely local — nothing here is graded or saved, the same as the
 * rest of the glossary.
 *
 * The flipping layer is keyed by its position in the deck, so moving to
 * another card mounts a fresh, unflipped one rather than animating the old
 * card back over — which would flash the NEXT card's answer mid-rotation.
 * Only that inner layer remounts, not the <button>, so a learner flipping
 * through with the arrow keys keeps focus on the card.
 */
export function AbjadFlashcardDeck({ letters, form, courseCode }: AbjadFlashcardDeckProps) {
  const cards = useMemo(() => abjadFlashcards(letters), [letters]);
  const [order, setOrder] = useState<number[] | null>(null);
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = cards[order ? order[position] : position];

  function go(delta: number) {
    setPosition((p) => (p + delta + cards.length) % cards.length);
    setFlipped(false);
  }

  function toggleShuffle() {
    setOrder((current) => (current ? null : shuffled(cards.length)));
    setPosition(0);
    setFlipped(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") go(1);
    else if (event.key === "ArrowLeft") go(-1);
    else return;
    event.preventDefault();
  }

  return (
    <div className={styles.deck} onKeyDown={onKeyDown}>
      <button type="button" className={styles.card} data-flipped={flipped} onClick={() => setFlipped((f) => !f)}>
        <span key={`${position}:${card.id}`} className={styles.inner}>
          <span className={styles.face} aria-hidden={flipped}>
            {/* Sized on a wrapper so DirectionalText's inline script-size preference scales it rather than replacing it (same as AbjadLetterTile). */}
            <span className={styles.glyph}>
              <DirectionalText courseCode={courseCode}>{letterInForm(card.letter, form)}</DirectionalText>
            </span>
            <span className={styles.prompt}>
              What sound, what name?
              <FlipIcon />
            </span>
          </span>

          <span className={`${styles.face} ${styles.back}`} aria-hidden={!flipped}>
            <span className={styles.soundLabel}>Sound</span>
            <span className={styles.sound}>{card.sound.label}</span>
            <span className={styles.hint}>{card.sound.hint}</span>
            <span className={styles.names}>
              <span className={styles.nameRomanized}>{card.nameRomanized}</span>
              <span className={styles.divider} aria-hidden="true" />
              <DirectionalText courseCode={courseCode} className={styles.nameNative}>
                {card.nameNative}
              </DirectionalText>
            </span>
          </span>
        </span>
      </button>

      <div className={styles.controls}>
        <Button variant="secondary" className={styles.control} onClick={() => go(-1)} aria-label="Previous card">
          ‹
        </Button>
        <span className={styles.counter}>
          {position + 1} / {cards.length}
        </span>
        <Button variant="secondary" className={styles.control} onClick={() => go(1)} aria-label="Next card">
          ›
        </Button>
      </div>
      <Button variant="secondary" className={styles.shuffle} onClick={toggleShuffle}>
        {order ? "Back to alphabet order" : "Shuffle"}
      </Button>
    </div>
  );
}
