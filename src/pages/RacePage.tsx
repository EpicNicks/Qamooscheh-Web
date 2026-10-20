import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBootstrap } from "../hooks/useBootstrap";
import { RaceRound } from "../components/race/RaceRound";
import { SegmentedToggle } from "../components/common/SegmentedToggle";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Button } from "../components/common/Button";
import type { RaceMode } from "../types/api";
import styles from "./FlashcardsPage.module.css";

/**
 * The Repack race (issue #109), from the flashcards start screen: choose a
 * mode, then a run of fill-in-the-blank cards against the clock (RaceRound).
 * Perfect Delivery is ranked and ends at the third strike; Endless Practice is
 * unranked, with only a personal best.
 */
export function RacePage() {
  const navigate = useNavigate();
  const bootstrap = useBootstrap();
  const course = bootstrap.data?.course ?? null;
  const [mode, setMode] = useState<RaceMode>("perfect_delivery");
  const [hardcore, setHardcore] = useState(false);
  // Bumped per start, so a second run deals a fresh deck rather than reusing the first's.
  const [run, setRun] = useState<number | null>(null);

  if (bootstrap.isLoading) return <Spinner label="Loading…" />;
  if (bootstrap.isError) return <ErrorBanner message="Couldn't load your course." />;

  if (run !== null && course) {
    return <RaceRound key={run} course={course} mode={mode} hardcore={hardcore} onExit={() => setRun(null)} onBoards={() => navigate("/race/boards")} />;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>Race</h1>
        <Button variant="secondary" onClick={() => navigate("/flashcards")}>
          Back to flashcards
        </Button>
      </div>
      <p>Fill in the blanks against the clock. Words you're about to forget are worth more, up to twice as much.</p>
      <SegmentedToggle
        options={[
          { value: "perfect_delivery" as const, label: "Perfect Delivery" },
          { value: "endless_practice" as const, label: "Endless Practice" },
        ]}
        value={mode}
        onChange={setMode}
      />
      <p className={styles.note}>
        {mode === "perfect_delivery"
          ? "Ranked. A card not right on the first try is a strike, and the third strike ends the run. Most solved wins; a tie goes to the faster run."
          : "Unranked. Keep going until you stop or run out of cards; only your personal best is kept."}
      </p>
      <label className={styles.note}>
        <input type="checkbox" checked={hardcore} onChange={(event) => setHardcore(event.target.checked)} /> Hardcore: no typos forgiven. It has its own board.
      </label>
      <p className={styles.note}>
        Cards come from the saved words you've already reviewed. Finish more units and save their words to unlock more cards. A race needs a connection.
      </p>
      <div className={styles.actions}>
        <Button onClick={() => setRun((n) => (n ?? 0) + 1)} disabled={!course}>
          Start
        </Button>
        <Button variant="secondary" onClick={() => navigate("/race/boards")}>
          Boards
        </Button>
      </div>
    </div>
  );
}
