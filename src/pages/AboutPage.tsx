import { Link } from "react-router-dom";
import styles from "./AboutPage.module.css";

/**
 * Public, unauthenticated: reachable from the Login/Register "Learn more"
 * link, so it has to stand on its own without anything AppShell provides
 * (no sidebar, no nav). Content stays grounded in what actually exists
 * today rather than a roadmap; see the backend repo's own README for the
 * fuller status if that ever needs expanding.
 */
export function AboutPage() {
  return (
    <div className={styles.wrap}>
      <div className={styles.content}>
        <div className={styles.brand}>ParsLing</div>
        <p className={styles.tagline}>A guided, spaced-repetition way to actually learn Persian or Japanese.</p>

        <div className={styles.section}>
          <h2>What it is</h2>
          <p>
            ParsLing is a Duolingo-style language course: short lessons arranged along a branching skill path, each
            one a mix of exercise types: word bank, type-in, match, and speak, building toward full sentences,
            short stories, and conversations, rather than staying at isolated vocabulary.
          </p>
        </div>

        <div className={styles.section}>
          <h2>How it works</h2>
          <ul>
            <li>
              <strong>Spaced repetition.</strong> Every answer feeds an FSRS-based scheduler that decides what you
              review and when, instead of a fixed drill order.
            </li>
            <li>
              <strong>Native-script input.</strong> On-screen keyboards for Persian and Japanese, with a phonetic
              (romanized-typing) option for either, so you're never blocked on a layout you don't have installed.
            </li>
            <li>
              <strong>Instant, honest feedback.</strong> Typos and near-misses (a missing ZWNJ, an Arabic-vs-Persian
              character, a spacing variant) are recognized and corrected in place, rather than just marked wrong,
              though the server always re-grades every answer, so what you see in the moment is never the final word.
            </li>
            <li>
              <strong>Checkpoints.</strong> Already know a unit's material? Test out of it instead of taking every
              lesson in order.
            </li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2>Languages</h2>
          <p>Persian (فارسی) and Japanese (日本語) today, each with its own keyboard, grading rules, and course.</p>
        </div>

        <div className={styles.section}>
          <h2>Where it's at</h2>
          <p>
            ParsLing is in alpha: lessons, checkpoints, streaks, friends, and leagues are built and working, but
            new accounts are closed for now, while it's tested with a small group before opening more broadly.
          </p>
        </div>

        <p className={styles.back}>
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
