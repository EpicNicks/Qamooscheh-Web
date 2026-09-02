import { useState } from "react";
import { Button } from "../../components/common/Button";
import { TutorialOverlay, type TutorialStep } from "../../components/tutorial/TutorialOverlay";
import { SkipTutorialModal } from "../../components/tutorial/SkipTutorialModal";
import exerciseStyles from "../../components/lesson/Exercise.module.css";
import styles from "./OnboardingTutorialStep.module.css";

type Phase = "wordbank" | "typein" | "done";

const WORD_BANK_TILES = ["Hello", "Goodbye", "Thanks"];
const WORD_BANK_ANSWER = "Hello";
const TYPE_IN_ANSWER = "Goodbye";

/**
 * A self-contained mock lesson — not the real WordBankExercise/TypeInExercise
 * components, deliberately: those take a real ExerciseArtifact and are wired
 * into real grading/keyboard/audio machinery this has no business touching.
 * This borrows their CSS classes (Exercise.module.css) for visual parity so
 * it still LOOKS like a real lesson, with plain English content precisely
 * because a brand-new learner doesn't know their target language's script
 * yet — the goal here is teaching the controls, not the language.
 *
 * TutorialOverlay spotlights each control in turn while the learner can
 * still freely interact with the mock exercise underneath; finishing an
 * exercise (right or wrong, retry until correct) advances to the next
 * phase, which swaps in a fresh set of callouts.
 */
export function OnboardingTutorialStep({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("wordbank");
  const [chosen, setChosen] = useState<number[]>([]);
  const [typed, setTyped] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [guided, setGuided] = useState(true);
  const [confirmingSkip, setConfirmingSkip] = useState(false);

  // Callback refs (not useRef + reading .current during render) so a
  // freshly-mounted target element is picked up via a normal state update,
  // the same pattern LanguageSettingsButton's anchor button uses.
  const [promptEl, setPromptEl] = useState<HTMLElement | null>(null);
  const [tilesEl, setTilesEl] = useState<HTMLElement | null>(null);
  const [inputEl, setInputEl] = useState<HTMLElement | null>(null);
  const [submitEl, setSubmitEl] = useState<HTMLElement | null>(null);

  function toggleTile(i: number) {
    setChosen((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
    setFeedback(null);
  }

  function submitWordBank() {
    const answer = chosen.map((i) => WORD_BANK_TILES[i]).join(" ");
    if (answer === WORD_BANK_ANSWER) {
      setFeedback("Correct!");
      setTimeout(() => {
        setFeedback(null);
        setChosen([]);
        setPhase("typein");
      }, 700);
    } else {
      setFeedback("Not quite — try again.");
    }
  }

  function submitTypeIn() {
    if (typed.trim().toLowerCase() === TYPE_IN_ANSWER.toLowerCase()) {
      setFeedback("Correct!");
      setTimeout(() => {
        setFeedback(null);
        setPhase("done");
      }, 700);
    } else {
      setFeedback("Not quite — try again.");
    }
  }

  const wordBankSteps: TutorialStep[] = [
    { targetEl: promptEl, title: "The prompt", description: "This tells you what to do for the exercise on screen." },
    { targetEl: tilesEl, title: "Word bank", description: "Tap the tiles, in order, to build your answer." },
    { targetEl: submitEl, title: "Submit", description: "Once your answer looks right, tap here to check it." },
  ];

  const typeInSteps: TutorialStep[] = [
    { targetEl: promptEl, title: "The prompt", description: "Some exercises ask you to type instead of tapping tiles." },
    { targetEl: inputEl, title: "Your answer", description: "Type your answer here." },
    { targetEl: submitEl, title: "Submit", description: "Tap here (or press Enter) when you're done." },
  ];

  if (phase === "done") {
    return (
      <div className={styles.done}>
        <h1>Nice work!</h1>
        <p>That's the shape of every lesson — read the prompt, answer it, then check your work.</p>
        <Button onClick={onDone}>Continue</Button>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <span className={styles.progress}>{phase === "wordbank" ? "Step 1 of 2" : "Step 2 of 2"}</span>
        <button type="button" className={styles.skipLink} onClick={() => setConfirmingSkip(true)}>
          Skip tutorial
        </button>
      </div>

      {phase === "wordbank" ? (
        <>
          <p ref={setPromptEl} className={exerciseStyles.prompt}>
            Tap the word for "Hello"
          </p>
          <div ref={setTilesEl} className={exerciseStyles.answerRow}>
            {chosen.map((i, position) => (
              <button key={position} type="button" className={exerciseStyles.tile} onClick={() => toggleTile(i)}>
                {WORD_BANK_TILES[i]}
              </button>
            ))}
          </div>
          <div className={exerciseStyles.tiles}>
            {WORD_BANK_TILES.map((tile, i) =>
              chosen.includes(i) ? null : (
                <button key={i} type="button" className={exerciseStyles.tile} onClick={() => toggleTile(i)}>
                  {tile}
                </button>
              ),
            )}
          </div>
        </>
      ) : (
        <>
          <p ref={setPromptEl} className={exerciseStyles.prompt}>
            Type the word for "Goodbye"
          </p>
          <input
            ref={setInputEl}
            className={exerciseStyles.input}
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              setFeedback(null);
            }}
            autoFocus
          />
        </>
      )}

      {feedback && <p className={styles.feedback}>{feedback}</p>}

      <div ref={setSubmitEl} className={exerciseStyles.actions}>
        <Button onClick={phase === "wordbank" ? submitWordBank : submitTypeIn}>Submit</Button>
      </div>

      {guided && <TutorialOverlay resetKey={phase} steps={phase === "wordbank" ? wordBankSteps : typeInSteps} onFinish={() => setGuided(false)} />}

      {confirmingSkip && <SkipTutorialModal onCancel={() => setConfirmingSkip(false)} onConfirm={onDone} />}
    </div>
  );
}
