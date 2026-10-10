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
    question: "Why does some audio sound different, or not play at all?",
    answer: (
      <>
        <p>
          The Persian course is recorded: words, prompts and answers play real recordings. Anything that hasn't been
          recorded yet is read aloud by your device's own text-to-speech voice instead, so that audio sounds different
          and depends on your device.
        </p>
        <p>If you hear nothing, or the play button is greyed out, your device has no voice for that language:</p>
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
        <p>
          You can choose what plays on its own in Settings → Input: <em>Autoplay audio</em> (each prompt),{" "}
          <em>Read words aloud when I pick them from the word bank</em>, and <em>Read the answer aloud after I
          answer</em>. Every play button still works with these off.
        </p>
      </>
    ),
  },
  {
    id: "word-hints",
    question: "Can I see what a word means while I'm answering?",
    answer: (
      <>
        <p>
          Yes. Hover over a word, or tap it, to see its translation or romanization. The ⚙ in a lesson's top bar
          picks which hints show, and can also show vowel marks and a romanized line above each sentence.
        </p>
        <p>
          Revealing the Persian for an English word marks that exercise as hinted. A hinted answer doesn't count as
          remembering the word: it earns half the XP, and the word comes back for review sooner.
        </p>
        <p>
          To look words up before a lesson, open its Start popover on the path and choose <em>Review vocabulary</em>.
        </p>
      </>
    ),
  },
  {
    id: "passing-a-lesson",
    question: "Why didn't I pass a lesson?",
    answer: (
      <>
        <p>
          A lesson needs 75% on your first tries to pass and unlock the next one. A wrong answer comes back later in
          the lesson, but getting it right the second time doesn't add to the score. An answer accepted with a
          small typo counts as half.
        </p>
        <p>Your answers still count toward your reviews either way, so take it again to pass.</p>
      </>
    ),
  },
  {
    id: "saved-words",
    question: "How do saved words and flashcards work?",
    answer: (
      <>
        <p>
          Save a word or expression with its ★: on the vocabulary list, or in the <em>Save words</em> row that comes
          up after you answer an exercise. Saved words are listed under the vocabulary page's <em>Saved</em> tab. The
          free plan saves up to 100, counted across all your courses.
        </p>
        <ul>
          <li>
            <strong>Flashcards</strong> — <em>Type the meaning</em> earns 5 XP for each meaning you get right.{" "}
            <em>Flip cards</em> is practice only and earns nothing on its own.
          </li>
          <li>
            <strong>Practise saved words</strong> — your most-due saved words, each as a flip card followed by
            exercises from lessons that use it. The exercises count just like a lesson's, and each flip card you knew
            earns 5 XP.
          </li>
        </ul>
        <p>
          Flashcards never change your review schedule, and they earn at most 200 XP a day per course.
        </p>
      </>
    ),
  },
  {
    id: "xp",
    question: "Where does XP come from?",
    answer: (
      <>
        <p>
          Mostly from lessons, for each exercise you answer: 10 XP for getting it right first time, 7 with a small
          typo, and 3 for getting it right when it comes back after a miss. After a wrong typed answer,{" "}
          <em>Retry</em> lets you type the correct answer once more: 2 XP the first time for that exercise, 1 the second, and
          nothing after that. A hinted answer earns half, and a wrong
          one nothing; how fast you answer doesn't matter. Flashcards add more (see above).
        </p>
        <p>
          The XP that pops up after each answer is what the lesson earns you once it's saved, and the total shows at
          the end. Practice rounds (<em>Practice anyway</em>, <em>Replay this lesson</em>) earn none, since they don't
          count toward your reviews.
          Your daily goal is in Settings → Goals, and leagues rank you by the XP you earn.
        </p>
      </>
    ),
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
    question: "What's the difference between the red ×, \"Test out\" and \"Skip ahead\"?",
    answer: (
      <>
        <p>
          The red × leaves the lesson. Nothing you've answered so far is saved, and none of it counts toward your
          progress.
        </p>
        <p>
          <em>Test out</em>, in a lesson's Start popover, is a short quiz instead of the full lesson: pass it and you
          move past that lesson. <em>Skip ahead</em> on the path does the same for a bigger jump, if you already know
          the material up to that point.
        </p>
      </>
    ),
  },
  {
    id: "fonts",
    question: "Persian text is hard to read. Can I change the font?",
    answer: (
      <p>
        Yes: Settings → Appearance lets you pick a font for each script, from the fonts on your device, and set its
        size. You can also type in the name of any other font you have installed. These choices are saved on this
        device only, since which fonts look right depends on the device.
      </p>
    ),
  },
  {
    id: "color-vision",
    question: "I'm colorblind. Can I tell right and wrong answers apart?",
    answer: (
      <p>
        Yes: Settings → Appearance → Color vision has palettes for red-green and blue-yellow colorblindness. They
        change the colors that mark words right, wrong, swapped or missing so each one stays distinct, and add ✓, ⇄
        and ✗ to the tiles of a reviewed answer, so color isn't the only clue. Like fonts, this is saved on this
        device only.
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
