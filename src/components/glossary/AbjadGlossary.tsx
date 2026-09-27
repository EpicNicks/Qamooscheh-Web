import { useMemo, useState } from "react";
import { ABJAD_LETTERS, ABJAD_SOUNDS, abjadSoundGroups, LETTER_FORMS, type LetterForm } from "../../domain/persian/abjad";
import { lettersMatching, type LetterSearchToken } from "../../domain/persian/abjadSearch";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { SegmentedToggle } from "../common/SegmentedToggle";
import { AbjadLetterTile } from "./AbjadLetterTile";
import { AbjadFlashcardDeck } from "./AbjadFlashcardDeck";
import { AbjadLetterSearch } from "./AbjadLetterSearch";
import styles from "./AbjadGlossary.module.css";

type View = "letters" | "flashcards";

const FORM_LABELS: Record<LetterForm, string> = { isolated: "Isolated", initial: "Initial", medial: "Medial", final: "Final" };
// Four full-name options run a little wider than a narrow phone's column, so
// the mobile toggle says the same thing in plainer, shorter words.
const FORM_LABELS_SHORT: Record<LetterForm, string> = { isolated: "Alone", initial: "Start", medial: "Middle", final: "End" };

const SOUND_GROUPS = abjadSoundGroups();

/**
 * The glossary's "Persian Letters (Abjad)" page body: every letter as a tile,
 * clustered by the sound it makes — so the three s's, four z's, two h's etc.
 * sit together and read as "one sound, several spellings" — plus a
 * flashcard deck over the same letters. One positional-form toggle and one
 * letter search drive both views, so switching between them keeps the form
 * being studied and the letters narrowed down to.
 *
 * A search narrows each sound group to its matching letters and hides the
 * groups left empty, but a partly-matched group keeps its enclosure and says
 * how many of its letters are showing — searching ث still shows that it's
 * one of three s's.
 */
export function AbjadGlossary({ courseCode }: { courseCode: string | null | undefined }) {
  const [view, setView] = useState<View>("letters");
  const [form, setForm] = useState<LetterForm>("isolated");
  const [search, setSearch] = useState<LetterSearchToken[]>([]);
  const formLabels = useIsMobile() ? FORM_LABELS_SHORT : FORM_LABELS;

  const matching = useMemo(() => lettersMatching(search), [search]);
  const groups = matching
    ? SOUND_GROUPS.map((group) => ({ ...group, shown: group.letters.filter((l) => matching.has(l.letter)) })).filter((g) => g.shown.length > 0)
    : SOUND_GROUPS.map((group) => ({ ...group, shown: group.letters }));
  const deckLetters = useMemo(() => (matching ? ABJAD_LETTERS.filter((l) => matching.has(l.letter)) : ABJAD_LETTERS), [matching]);

  return (
    <div className={styles.wrap}>
      <div className={styles.toggles}>
        <SegmentedToggle
          options={[
            { value: "letters" as const, label: "Letters" },
            { value: "flashcards" as const, label: "Flashcards" },
          ]}
          value={view}
          onChange={setView}
        />
      </div>
      {/* Its own element, a direct child of .wrap, so it can stay pinned
          under the app header for the whole page — switching forms is
          most useful while looking at letters far down the list. */}
      <div className={styles.formBar}>
        <SegmentedToggle options={LETTER_FORMS.map((f) => ({ value: f, label: formLabels[f] }))} value={form} onChange={setForm} />
      </div>

      <div className={styles.search}>
        <AbjadLetterSearch tokens={search} onTokensChange={setSearch} courseCode={courseCode} />
        <p className={styles.status} role="status">
          {matching ? `Showing ${deckLetters.length} of ${ABJAD_LETTERS.length} letters` : ""}
        </p>
      </div>

      {view === "letters" ? (
        <div className={styles.groups}>
          {groups.map((group) => {
            const sound = ABJAD_SOUNDS[group.sound];
            const shared = group.letters.length > 1;
            return (
              <section key={group.sound} className={styles.group} data-shared={shared} aria-label={`Sound: ${sound.label}`}>
                <header className={styles.groupHeader}>
                  <span className={styles.headerRow}>
                    <span className={styles.sound}>{sound.label}</span>
                    {shared && (
                      <span className={styles.count}>
                        {group.shown.length < group.letters.length ? `${group.shown.length} of ${group.letters.length}` : group.letters.length} letters
                      </span>
                    )}
                  </span>
                  <span className={styles.hint} title={sound.hint}>
                    {sound.hint}
                  </span>
                </header>
                <div className={styles.tiles}>
                  {group.shown.map((letter) => (
                    <AbjadLetterTile key={letter.letter} letter={letter} form={form} courseCode={courseCode} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        // Keyed by the deck's contents: a new search starts a fresh deck at
        // card 1 rather than carrying a position/shuffle over from a deck of
        // a different size.
        <AbjadFlashcardDeck key={deckLetters.map((l) => l.letter).join("")} letters={deckLetters} form={form} courseCode={courseCode} />
      )}
    </div>
  );
}
