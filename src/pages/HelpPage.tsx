import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import styles from "./HelpPage.module.css";

interface FaqEntry {
  id: string;
  question: string;
  answer: React.ReactNode;
}

const FAQ: FaqEntry[] = [
  {
    id: "tts-voice",
    question: "Why isn't there any audio for some lessons?",
    answer: (
      <>
        <p>
          ParsLing doesn't ship recorded audio for every phrase yet — where there's no recording, the app asks
          your device to read the phrase aloud instead, using its own built-in text-to-speech voices.
        </p>
        <p>
          That means the voice (and whether there's a voice at all) depends on your device, not on ParsLing:
        </p>
        <ul>
          <li>
            <strong>Windows</strong> — a language needs its <em>Speech</em> feature installed, not just its keyboard
            or display language: Settings → Time &amp; Language → Language &amp; region → click your language →
            Language options → add the "Speech" component if it isn't already there. Persian voices in particular
            often aren't available on Windows even after this.
          </li>
          <li>
            <strong>macOS</strong> — Settings → Accessibility → Spoken Content → System voice → manage voices.
          </li>
          <li>
            <strong>Android</strong> — usually has broad language support out of the box and downloads missing
            voices automatically the first time they're needed.
          </li>
          <li>
            <strong>iOS</strong> — Settings → Accessibility → Spoken Content → Voices.
          </li>
        </ul>
        <p>If your device has no matching voice installed, the play button for that phrase is disabled.</p>
      </>
    ),
  },
  {
    id: "why-vocabulary-hidden",
    question: "Why don't exercises show a word's meaning while I'm answering?",
    answer: <p>Showing a translation on screen while you're being asked for it would give the answer away. Use the vocabulary review screen (from any lesson's Start popover) to look words up ahead of time instead.</p>,
  },
  {
    id: "review-intensity",
    question: "What does \"Review intensity\" in Settings actually change?",
    answer: (
      <>
        <p>
          ParsLing schedules your reviews with FSRS (Free Spaced Repetition Scheduler), an algorithm that predicts
          how likely you are to still remember a card and times your next review around that prediction — instead
          of a fixed "every 3 days" schedule, cards you find easy drift further apart and ones you miss come back
          sooner.
        </p>
        <p>
          "Review intensity" sets FSRS's target: how confident it tries to keep you before it's willing to let a
          review lapse.
        </p>
        <ul>
          <li><strong>Relaxed</strong> (85%) — fewer reviews, and you'll forget a few more cards along the way.</li>
          <li><strong>Balanced</strong> (90%) — FSRS's own recommended default.</li>
          <li><strong>Thorough</strong> (94%) — more frequent reviews, in exchange for forgetting less.</li>
        </ul>
        <p>Changing it recalculates every card's next review date the moment you save — it isn't retroactive, but it takes effect immediately, not just for cards you review from then on.</p>
      </>
    ),
  },
  {
    id: "skip-vs-test-out",
    question: "What's the difference between the red × and \"Skip\" on a lesson?",
    answer: (
      <p>
        The red × closes the lesson entirely without saving anything you've answered so far. "Skip"/"Test out" is a
        different thing — it lets you attempt a short check to prove you already know the material coming up,
        instead of doing the full lesson for it.
      </p>
    ),
  },
];

/** A plain FAQ, each entry a native `<details>` disclosure — no accordion library, and it works with the browser's own find-in-page. Supports deep-linking to one entry via `#id` (used by the "no voice installed" toast). */
export function HelpPage() {
  const location = useLocation();
  // Which entries are open, owned here rather than derived from the hash on
  // every render: `open={hash === id}` alone is a controlled prop React
  // re-asserts on ANY re-render, so an entry the reader opened themselves
  // snapped shut again the moment anything else on the page changed. The hash
  // only ever ADDS to this set (on mount and on a later hash change); every
  // change after that comes from the reader, through onToggle.
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(
    () => new Set(location.hash ? [location.hash.slice(1)] : []),
  );

  function setOpen(id: string, open: boolean) {
    setOpenIds((prev) => {
      if (prev.has(id) === open) return prev;
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // A later hash change (a second "no voice installed" toast, say) opens that
  // entry too — adjusted during render rather than from the effect below,
  // which keeps the effect to the one thing that genuinely reaches outside
  // React: scrolling the entry into view.
  const [seededHash, setSeededHash] = useState(location.hash);
  if (seededHash !== location.hash) {
    setSeededHash(location.hash);
    if (location.hash) setOpen(location.hash.slice(1), true);
  }

  useEffect(() => {
    if (!location.hash) return;
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: "center" });
  }, [location.hash]);

  return (
    <div className={styles.wrap}>
      <h1>Help &amp; FAQ</h1>
      <div className={styles.list}>
        {FAQ.map((entry) => (
          <details
            key={entry.id}
            id={entry.id}
            className={styles.entry}
            open={openIds.has(entry.id)}
            onToggle={(event) => setOpen(entry.id, event.currentTarget.open)}
          >
            <summary className={styles.question}>{entry.question}</summary>
            <div className={styles.answer}>{entry.answer}</div>
          </details>
        ))}
      </div>
    </div>
  );
}
