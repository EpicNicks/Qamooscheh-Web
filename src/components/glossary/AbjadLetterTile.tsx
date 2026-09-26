import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { letterInForm, type AbjadLetter, type LetterForm } from "../../domain/persian/abjad";
import { DirectionalText } from "../common/DirectionalText";
import { FlipIcon } from "../common/icons";
import styles from "./AbjadLetterTile.module.css";

// A run of Perso-Arabic script (letters, tatweel, ZWNJ), spaces allowed
// between words so a multi-word phrase stays one run.
const PERSIAN_RUN = /([\u0600-\u06FF\u200C]+(?:\s+[\u0600-\u06FF\u200C]+)*)/;

/**
 * Notes are English prose quoting Persian (آ, خانه, ...). Each quoted run
 * goes through DirectionalText so it gets the Persian font and its own
 * bidi isolate — otherwise it renders in the Latin fallback font, and an RTL
 * run beside "(" or "," can visually swap places with its neighbors.
 */
function NoteText({ text, courseCode }: { text: string; courseCode: string | null | undefined }) {
  return text.split(PERSIAN_RUN).map((part, i) =>
    i % 2 === 1 ? (
      <DirectionalText key={i} courseCode={courseCode}>
        {part}
      </DirectionalText>
    ) : (
      part
    ),
  );
}

interface AbjadLetterTileProps {
  letter: AbjadLetter;
  form: LetterForm;
  courseCode: string | null | undefined;
}

/**
 * One letter as a two-sided tile. The front is the letter itself (in the
 * chosen positional form) and its name; the back is an example word plus
 * whatever the letter's `note` has to say about it.
 *
 * The flip control is the tile's own footer strip, not a separate button
 * floating over it — "Learn more" on the front, "Back" on the back, each
 * spanning the tile's full width. Whichever face is turned away is `inert`,
 * so neither its footer nor its text is reachable while hidden, and focus is
 * handed to the newly-visible footer after each flip (flushSync so it has
 * already stopped being inert when .focus() runs) — otherwise focus would
 * be stranded on a button that just went inert.
 */
export function AbjadLetterTile({ letter, form, courseCode }: AbjadLetterTileProps) {
  const [flipped, setFlipped] = useState(false);
  const frontFooter = useRef<HTMLButtonElement>(null);
  const backFooter = useRef<HTMLButtonElement>(null);

  function flip(next: boolean) {
    flushSync(() => setFlipped(next));
    (next ? backFooter : frontFooter).current?.focus();
  }

  return (
    <div className={styles.tile} data-flipped={flipped}>
      <div className={styles.inner}>
        <div className={styles.face} inert={flipped || undefined}>
          {/* Sized on a wrapper: DirectionalText's own inline font-size is the
              learner's script-size preference (a percentage), which would
              override a size set on it directly — it scales this instead. */}
          <span className={styles.glyph}>
            <DirectionalText courseCode={courseCode}>{letterInForm(letter, form)}</DirectionalText>
          </span>
          <div className={styles.name}>
            <span className={styles.nameRomanized}>{letter.nameRomanized}</span>
            <DirectionalText courseCode={courseCode} className={styles.nameNative}>
              {letter.nameNative}
            </DirectionalText>
          </div>
          <button
            ref={frontFooter}
            type="button"
            className={styles.footer}
            aria-label={`Learn more about ${letter.nameRomanized}`}
            onClick={() => flip(true)}
          >
            Learn more
            <FlipIcon />
          </button>
        </div>

        <div className={`${styles.face} ${styles.back}`} inert={!flipped || undefined}>
          <div className={styles.backBody}>
            <div className={styles.example}>
              <span className={styles.exampleWord}>
                <DirectionalText courseCode={courseCode}>{letter.example.word}</DirectionalText>
              </span>
              <span className={styles.exampleGloss}>
                <i>{letter.example.romanization}</i> · {letter.example.meaning}
              </span>
            </div>
            {!letter.joinsNext && <span className={styles.chip}>Doesn't connect forward</span>}
            {letter.note && (
              <p className={styles.note}>
                <NoteText text={letter.note} courseCode={courseCode} />
              </p>
            )}
          </div>
          <button ref={backFooter} type="button" className={styles.footer} aria-label={`Back to ${letter.nameRomanized}`} onClick={() => flip(false)}>
            Back
            <FlipIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
