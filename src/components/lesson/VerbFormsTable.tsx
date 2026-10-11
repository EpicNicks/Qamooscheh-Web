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
