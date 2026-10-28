import { DirectionalText } from "../common/DirectionalText";
import { AbjadGlossary } from "./AbjadGlossary";
import type { GlossaryEntry } from "../../domain/glossaryContent";
import styles from "./GlossaryEntryView.module.css";

/** One leaf glossary entry's body — shared by its own page (GlossaryEntryPage) and the intro prompt's modal (IntroGlossaryPrompt). */
export function GlossaryEntryView({ entry, courseCode }: { entry: GlossaryEntry; courseCode: string | null | undefined }) {
  return (
    <>
      <h1 className={styles.title}>{entry.title}</h1>
      {entry.note && <p className={styles.note}>{entry.note}</p>}
      {entry.view === "abjad" ? (
        <AbjadGlossary courseCode={courseCode} />
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Term</th>
                <th>Romanization</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              {(entry.terms ?? []).map((term) => (
                <tr key={term.term}>
                  <td>
                    <DirectionalText courseCode={courseCode} className={styles.native}>
                      {term.term}
                    </DirectionalText>
                  </td>
                  <td className={styles.romanization}>{term.romanization}</td>
                  <td className={styles.definition}>{term.definition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
