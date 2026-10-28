import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getRaceBoard } from "../api/race";
import { useBootstrap } from "../hooks/useBootstrap";
import { clock, detectDeviceClass, emptyBoardText, scoreText } from "../domain/race";
import { SegmentedToggle } from "../components/common/SegmentedToggle";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Button } from "../components/common/Button";
import type { RaceScope } from "../types/api";
import styles from "./RaceBoardsPage.module.css";
import flashcardStyles from "./FlashcardsPage.module.css";

/**
 * Perfect Delivery's boards (issue #109): global, country, this week and
 * friends, split by hardcore and by device class. The boards are separate per
 * class, so this page shows the class this device plays as.
 */
export function RaceBoardsPage() {
  const navigate = useNavigate();
  const bootstrap = useBootstrap();
  const courseCode = bootstrap.data?.course?.code ?? null;
  const [scope, setScope] = useState<RaceScope>("global");
  const [hardcore, setHardcore] = useState(false);
  const deviceClass = detectDeviceClass();

  const board = useQuery({
    queryKey: ["race", "board", courseCode, scope, hardcore, deviceClass],
    queryFn: () => getRaceBoard({ courseCode: courseCode!, mode: "perfect_delivery", scope, deviceClass, hardcore }),
    enabled: courseCode !== null,
  });

  return (
    <div className={flashcardStyles.wrap}>
      <div className={flashcardStyles.header}>
        <h1 className={flashcardStyles.title}>Boards</h1>
        <Button variant="secondary" onClick={() => navigate("/race")}>
          Back
        </Button>
      </div>
      <SegmentedToggle
        options={[
          { value: "global" as const, label: "Global" },
          { value: "country" as const, label: "Country" },
          { value: "weekly" as const, label: "Week" },
          { value: "friends" as const, label: "Friends" },
        ]}
        value={scope}
        onChange={setScope}
      />
      <label className={flashcardStyles.note}>
        <input type="checkbox" checked={hardcore} onChange={(event) => setHardcore(event.target.checked)} /> Hardcore board
      </label>
      <p className={flashcardStyles.note}>
        Perfect Delivery, on {deviceClass === "touch" ? "touch devices" : "keyboard devices"}. The week runs Monday to Monday, UTC.
      </p>
      {bootstrap.isLoading || board.isLoading ? (
        <Spinner label="Loading the board…" />
      ) : board.isError || bootstrap.isError ? (
        <ErrorBanner message="Couldn't load the board." />
      ) : board.data && board.data.entries.length > 0 ? (
        <ol className={styles.board}>
          {board.data.entries.map((entry) => (
            <li key={entry.userId} className={entry.isYou ? `${styles.row} ${styles.you}` : styles.row}>
              <span className={styles.rank}>#{entry.rank}</span>
              <span className={styles.name}>
                {entry.displayName ?? "Learner"}
                {entry.isYou ? " (you)" : ""}
                {entry.country && <span className={styles.country}> {entry.country}</span>}
              </span>
              <span className={styles.result}>
                <strong>{scoreText(entry.score)}</strong>
                <span className={styles.time}>{clock(entry.timeMs)}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p>{emptyBoardText(scope)}</p>
      )}
    </div>
  );
}
