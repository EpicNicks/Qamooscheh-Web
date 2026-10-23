// Presentation of a verb index entry (types/content.ts's VerbIndexEntry,
// verbs.json). The publisher generates every table, so nothing here conjugates:
// it only orders and labels what the entry already holds.
import type { VerbCell, VerbIndexEntry, VerbPerson, VerbTense } from "../types/content";

export const VERB_TENSES: readonly { tense: VerbTense; label: string }[] = [
  { tense: "present", label: "Present" },
  { tense: "simplePast", label: "Simple past" },
  { tense: "pastContinuous", label: "Past continuous" },
  { tense: "presentPerfect", label: "Present perfect" },
  { tense: "subjunctive", label: "Subjunctive" },
  { tense: "imperative", label: "Imperative" },
  { tense: "future", label: "Future" },
];

export const VERB_PERSONS: readonly { person: VerbPerson; label: string }[] = [
  { person: "1s", label: "I" },
  { person: "2s", label: "you" },
  { person: "3s", label: "he / she" },
  { person: "1p", label: "we" },
  { person: "2p", label: "you (pl.)" },
  { person: "3p", label: "they" },
];

/** The tenses an entry actually has a table for, in teaching order. */
export function availableTenses(entry: VerbIndexEntry): { tense: VerbTense; label: string }[] {
  return VERB_TENSES.filter(({ tense }) => Object.keys(entry.table[tense] ?? {}).length > 0);
}

export interface VerbRow {
  person: VerbPerson;
  label: string;
  written: string;
  /** Null where the course authors no spoken stems for this verb (and always, for the future). */
  spoken: string | null;
  /** Romanizations of `written` and `spoken`, for a hover; null where the publisher emits none. */
  writtenRomanization: string | null;
  spokenRomanization: string | null;
}

/** One tense as table rows, in person order, for the affirmative or the negative. Persons the tense lacks (the imperative has two) are left out. */
export function verbRows(entry: VerbIndexEntry, tense: VerbTense, negative: boolean): VerbRow[] {
  const cells = entry.table[tense] ?? {};
  return VERB_PERSONS.flatMap(({ person, label }) => {
    const cell: VerbCell | undefined = cells[person];
    if (!cell) return [];
    return [
      {
        person,
        label,
        written: negative ? cell.negative : cell.written,
        spoken: negative ? cell.negativeSpoken : cell.spoken,
        writtenRomanization: (negative ? cell.negativeRomanization : cell.writtenRomanization) ?? null,
        spokenRomanization: (negative ? cell.negativeSpokenRomanization : cell.spokenRomanization) ?? null,
      },
    ];
  });
}

/** Whether to show a spoken column: any row in the tense has one. */
export function hasSpokenColumn(rows: readonly VerbRow[]): boolean {
  return rows.some((row) => row.spoken !== null);
}
