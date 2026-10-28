import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { finishRace, startRace } from "../../api/race";
import { useSavedClozeDeck } from "../../hooks/useSavedClozeDeck";
import { ClozeCard } from "../flashcards/ClozeCard";
import { Spinner } from "../common/Spinner";
import { ErrorBanner } from "../common/ErrorBanner";
import { Button } from "../common/Button";
import type { ClozeCard as ClozeCardData, ClozeResult } from "../../domain/cloze";
import { MAX_STRIKES, clock, dealable, detectDeviceClass, ended, heldMessage, score, scoreText, strikes } from "../../domain/race";
import type { CourseRef, FinishRaceResponse, RaceMode } from "../../types/api";
import styles from "./RaceRound.module.css";
import flashcardStyles from "../../pages/FlashcardsPage.module.css";

/** Saved words one race deals at most: the practice endpoint's ceiling. */
const RACE_WORDS = 30;

const NOTHING_TO_RACE =
  "No saved word has a sentence and a review yet. Finish a unit, save its words, then come back. Each unit you finish unlocks more cards.";

interface RaceRoundProps {
  course: CourseRef;
  mode: RaceMode;
  hardcore: boolean;
  /** Back to the lobby. */
  onExit: () => void;
  onBoards: () => void;
}

type Run = {
  runId: string;
  deck: readonly ClozeCardData[];
  weights: Record<string, number>;
  results: ClozeResult[];
  startedAt: number;
};

type Phase =
  | { kind: "starting" }
  | { kind: "failed"; message: string }
  | { kind: "nothing" }
  | { kind: "run"; run: Run; sending: boolean; sendFailed: boolean; confirmingLeave: boolean }
  | { kind: "done"; response: FinishRaceResponse };

/**
 * The Repack race (issue #109): fill-in-the-blank cards against the clock,
 * each solved word scored by how forgotten it was. The deck is built and
 * graded here exactly like a cloze round (ClozeCard); the server issues the
 * FSRS weights when the run starts and times and scores it when it ends. Both
 * ends need the network. Leaving a run unfinished abandons it: the next start
 * closes it.
 */
export function RaceRound({ course, mode, hardcore, onExit, onBoards }: RaceRoundProps) {
  const queryClient = useQueryClient();
  const { deck, session, isError } = useSavedClozeDeck(course, RACE_WORDS, "race-deck");
  const [phase, setPhase] = useState<Phase>({ kind: "starting" });
  const started = useRef(false);

  // Once the deck is built, ask the server for the run and the weights. A ref
  // guards the effect so a remount cannot open (and abandon) a second run.
  useEffect(() => {
    if (deck === null || started.current) return;
    started.current = true;
    if (deck.length === 0) return;
    startRace({ courseCode: course.code, mode, hardcore, deviceClass: detectDeviceClass(), tags: deck.map((card) => card.tag) })
      .then((response) => {
        const dealt = dealable(deck, (card) => card.tag, response.weights);
        if (dealt.length === 0) {
          setPhase({ kind: "nothing" });
          return;
        }
        setPhase({
          kind: "run",
          run: { runId: response.runId, deck: dealt, weights: response.weights, results: [], startedAt: performance.now() },
          sending: false,
          sendFailed: false,
          confirmingLeave: false,
        });
      })
      .catch(() => setPhase({ kind: "failed", message: "Couldn't start the race. A race needs a connection; check yours and try again." }));
  }, [deck, course.code, mode, hardcore]);

  async function send(run: Run) {
    setPhase({ kind: "run", run, sending: true, sendFailed: false, confirmingLeave: false });
    try {
      const response = await finishRace(run.runId, {
        answers: run.results.map((r) => ({ tag: r.tag, attempt: r.attempt, correct: r.correct, elapsedMs: r.elapsedMs })),
        deckDone: run.results.length >= run.deck.length,
      });
      setPhase({ kind: "done", response });
      // The answers paid XP and moved their cards, like any cloze round.
      for (const key of ["activity", "streak", "bootstrap", "sessionPlan"]) queryClient.invalidateQueries({ queryKey: [key] });
      queryClient.invalidateQueries({ queryKey: ["league", "current"] });
    } catch {
      // The same answers can be sent again; the server answers a repeat with what it banked.
      setPhase({ kind: "run", run, sending: true, sendFailed: true, confirmingLeave: false });
    }
  }

  if (isError) return <ErrorBanner message="Couldn't put together your race." />;
  if (phase.kind === "failed") {
    return (
      <div className={flashcardStyles.done}>
        <h1>Couldn't start</h1>
        <p role="alert">{phase.message}</p>
        <Button onClick={onExit}>Back</Button>
      </div>
    );
  }
  if (phase.kind === "nothing" || (deck !== null && deck.length === 0)) {
    return (
      <div className={flashcardStyles.done}>
        <h1>Nothing to race yet</h1>
        <p>{NOTHING_TO_RACE}</p>
        <Button onClick={onExit}>Back</Button>
      </div>
    );
  }
  if (phase.kind === "starting") return <Spinner label="Dealing your cards…" />;
  if (phase.kind === "done") return <RaceResults mode={mode} response={phase.response} onAgain={onExit} onBoards={onBoards} />;

  const { run } = phase;
  if (phase.sending) {
    return phase.sendFailed ? (
      <div className={flashcardStyles.done}>
        <h1>Couldn't save your run</h1>
        <p role="alert">Check your connection. Your answers are kept.</p>
        <div className={flashcardStyles.actions}>
          <Button onClick={() => send(run)}>Try again</Button>
          <Button variant="secondary" onClick={onExit}>
            Leave without saving
          </Button>
        </div>
      </div>
    ) : (
      <Spinner label="Saving your run…" />
    );
  }

  const current = run.deck[run.results.length];

  function finished(result: ClozeResult) {
    const next: Run = { ...run, results: [...run.results, result] };
    if (ended(mode, next.results) || next.results.length >= next.deck.length) {
      void send(next);
      return;
    }
    setPhase({ kind: "run", run: next, sending: false, sendFailed: false, confirmingLeave: false });
  }

  const banks = mode === "endless_practice" && run.results.length > 0;
  return (
    <div className={flashcardStyles.wrap}>
      <RaceHud run={run} mode={mode} />
      {current && <ClozeCard key={current.tag} card={current} courseCode={course.code} session={session} hardcore={hardcore} onFinished={finished} />}
      <div className={flashcardStyles.actions}>
        {phase.confirmingLeave ? (
          <>
            <p className={flashcardStyles.note}>
              {banks ? "Finish this run? Your answers so far are saved, with their XP and your personal best." : "Leave this race? Your answers so far won't be saved, and they won't earn any XP."}
            </p>
            <Button onClick={() => (banks ? void send(run) : onExit())}>{banks ? "Finish" : "Leave"}</Button>
            <Button variant="secondary" onClick={() => setPhase({ ...phase, confirmingLeave: false })}>
              Keep going
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={() => setPhase({ ...phase, confirmingLeave: true })}>
            {banks ? "Finish run" : "Leave race"}
          </Button>
        )}
      </div>
    </div>
  );
}

/** The strike meter, the position, the score and the clock, over the card. */
function RaceHud({ run, mode }: { run: Run; mode: RaceMode }) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(performance.now()), 100);
    return () => window.clearInterval(timer);
  }, []);
  const struck = strikes(run.results);
  return (
    <div className={styles.hud}>
      {mode === "perfect_delivery" && (
        <div className={styles.strikes} role="img" aria-label={`${struck} of ${MAX_STRIKES} strikes`}>
          {Array.from({ length: MAX_STRIKES }, (_, i) => (
            <span key={i} className={i < struck ? `${styles.strike} ${styles.struck}` : styles.strike} />
          ))}
        </div>
      )}
      <span className={styles.position}>
        {Math.min(run.results.length + 1, run.deck.length)} / {run.deck.length}
      </span>
      <span className={styles.stat} aria-label="Score">
        {scoreText(score(run.results, run.weights))}
      </span>
      <span className={styles.stat} aria-label="Time">
        {clock(now - run.startedAt, true)}
      </span>
    </div>
  );
}

function RaceResults({ mode, response, onAgain, onBoards }: { mode: RaceMode; response: FinishRaceResponse; onAgain: () => void; onBoards: () => void }) {
  const r = response;
  const endReason = r.endReason === "third_strike" ? "Ended at the third strike." : r.endReason === "deck_done" ? "You cleared the whole deck." : "You stopped the run.";
  return (
    <div className={flashcardStyles.done}>
      <h1>{r.strikes === 0 && r.solved > 0 ? "Perfect Delivery!" : "Race over"}</h1>
      <p className={styles.points}>{scoreText(r.score)} points</p>
      <p className={flashcardStyles.note}>
        {r.solved} solved · {r.strikes} strike{r.strikes === 1 ? "" : "s"} · {clock(r.timeMs)}
      </p>
      <p className={flashcardStyles.note}>{endReason}</p>
      {r.held ? (
        <p className={flashcardStyles.note}>{heldMessage(r.heldReason)}</p>
      ) : mode === "endless_practice" ? (
        <p className={flashcardStyles.note}>Endless Practice isn't ranked.</p>
      ) : (
        r.rank != null && <p className={styles.rank}>You're #{r.rank} on the global board.</p>
      )}
      {r.personalBest && (
        <p className={flashcardStyles.note}>
          Personal best: {scoreText(r.personalBest.score)} in {clock(r.personalBest.timeMs)}
        </p>
      )}
      <p className={flashcardStyles.note} role="status">
        {r.xp > 0 ? `+${r.xp} XP` : "No XP this run."}
      </p>
      <p className={flashcardStyles.note}>
        XP is the same as a fill-in-the-blank round: 5, 3 or 1 by attempt, and less for a word you've already practised a lot today, so a long run pays little.
      </p>
      <div className={flashcardStyles.actions}>
        <Button onClick={onAgain}>Race again</Button>
        <Button variant="secondary" onClick={onBoards}>
          Boards
        </Button>
      </div>
    </div>
  );
}
