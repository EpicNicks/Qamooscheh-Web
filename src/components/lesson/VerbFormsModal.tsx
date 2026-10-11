import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { availableTenses } from "../../domain/verbForms";
import type { VerbIndexEntry } from "../../types/content";
import { Button } from "../common/Button";
import { VerbFormsTable } from "./VerbFormsTable";
import styles from "./VerbFormsModal.module.css";

/**
 * A verb's infinitive, principal parts and stems, and its conjugation table —
 * a tab per tense, persons as rows, with a negative toggle. Opened from a
 * verb's word hint (AnnotatedText.tsx). Follows SkipLessonModal's pattern
 * (overlay div, role="dialog", Escape and a Tab trap via useFocusTrap), but is
 * portalled to the body: it opens from inside running text, whose ancestors
 * may be transformed or clipped.
 */
export function VerbFormsModal({ entry, onClose }: { entry: VerbIndexEntry; onClose: () => void }) {
  const tenses = availableTenses(entry);
  const [tense, setTense] = useState(tenses[0]?.tense ?? "present");
  const [negative, setNegative] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(dialogRef, { enabled: true, onEscape: onClose });

  return createPortal(
    <div
      className={styles.overlay}
      onClick={onClose}
      // Enter on a control here must not reach useAnswerConfirmation's window
      // listener, which would move the lesson on. Escape is left to the trap.
      onKeyDown={(event) => {
        if (event.key === "Enter") event.stopPropagation();
      }}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className={styles.title} dir="rtl" lang="fa">
          {entry.infinitive}
        </h2>
        <dl className={styles.facts}>
          <dt>Principal parts</dt>
          <dd className={styles.persian} dir="rtl" lang="fa">
            {entry.principalParts.join(" ، ")}
          </dd>
          <dt>Past stem</dt>
          <dd className={styles.persian} dir="rtl" lang="fa">
            {entry.pastStem}
          </dd>
          <dt>Present stem</dt>
          <dd className={styles.persian} dir="rtl" lang="fa">
            {entry.presentStem}
          </dd>
          {entry.prefix && (
            <>
              <dt>Prefix</dt>
              <dd className={styles.persian} dir="rtl" lang="fa">
                {entry.prefix}
              </dd>
            </>
          )}
        </dl>

        <div className={styles.tabs} role="group" aria-label="Tense">
          {tenses.map((t) => (
            <button
              key={t.tense}
              type="button"
              className={styles.tab}
              aria-pressed={t.tense === tense}
              onClick={() => setTense(t.tense)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className={styles.negative}>
          <input type="checkbox" checked={negative} onChange={(event) => setNegative(event.target.checked)} />
          Negative
        </label>
        <VerbFormsTable entry={entry} tense={tense} negative={negative} />

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
