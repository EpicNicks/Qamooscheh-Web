import type { VerbIndexEntry, VerbTense } from "../../types/content";
import { hasSpokenColumn, verbRows } from "../../domain/verbForms";
import styles from "./VerbFormsModal.module.css";

/**
 * One tense of a verb as a table: a row per person, the written form and, where
 * the course authors one, the spoken form. Persian text runs right to left in
 * its own cells; the page around it stays left to right.
 */
export function VerbFormsTable({ entry, tense, negative }: { entry: VerbIndexEntry; tense: VerbTense; negative: boolean }) {
  const rows = verbRows(entry, tense, negative);
  const spoken = hasSpokenColumn(rows);
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Person</th>
          <th scope="col">Written</th>
          {spoken && <th scope="col">Spoken</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.person}>
            <th scope="row">{row.label}</th>
            <td className={styles.persian} dir="rtl" lang="fa">
              {row.written}
            </td>
            {spoken && (
              <td className={styles.persian} dir="rtl" lang="fa">
                {row.spoken ?? row.written}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * The verb's heading: its infinitive and, where the course authors one, its
 * English gloss ("to buy") beneath it. `titleId` labels the popover.
 */
export function VerbFormsHeading({ entry, titleId }: { entry: VerbIndexEntry; titleId?: string }) {
  return (
    <div className={styles.heading}>
      <h2 id={titleId} className={styles.title} dir="rtl" lang="fa">
        {entry.infinitive}
      </h2>
      {entry.gloss && (
        <p className={styles.gloss} lang="en">
          {entry.gloss}
        </p>
      )}
    </div>
  );
}
