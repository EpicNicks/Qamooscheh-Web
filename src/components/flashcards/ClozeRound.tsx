import { useNavigate } from "react-router-dom";
import { useSavedClozeDeck } from "../../hooks/useSavedClozeDeck";
import { ClozeDeckRound } from "./ClozeDeckRound";
import { Spinner } from "../common/Spinner";
import { ErrorBanner } from "../common/ErrorBanner";
import { Button } from "../common/Button";
import type { CourseRef } from "../../types/api";
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
  const { deck, isError } = useSavedClozeDeck(course, ROUND_WORDS, "cloze-practice");

  if (isError) return <ErrorBanner message="Couldn't put together your fill-in-the-blank round." />;
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
