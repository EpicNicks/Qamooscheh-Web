import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { availableTenses } from "../../domain/verbForms";
import type { VerbIndexEntry } from "../../types/content";
import { Button } from "../common/Button";
import { VerbFormsTable } from "./VerbFormsTable";
import styles from "./VerbFormsModal.module.css";

/** Breathing room kept between the popover and the viewport edge, and between it and its word. */
const MARGIN = 8;

/**
 * A verb's infinitive, principal parts and stems, and its conjugation table —
 * a tab per tense, persons as rows, with a negative toggle. Opened from a
 * verb's word hint (AnnotatedText.tsx).
 *
 * A popover, not a modal: it sits beside the word with no backdrop, so the
 * lesson stays visible and usable, and it goes away by itself shortly after
 * the pointer leaves it and its word (the parent's hover closer, wired through
 * `onPointerEnter`/`onPointerLeave`). Escape, the Close button and a press
 * outside it also dismiss it — the last being what closes it on touch, which
 * has no hover. Portalled to the body: it opens from inside running text,
 * whose ancestors may be transformed or clipped.
 */
export function VerbFormsModal({
  entry,
  anchorEl,
  onClose,
  onPointerEnter,
  onPointerLeave,
}: {
  entry: VerbIndexEntry;
  /** The word it opened from: where it is placed, and a press on it is not "outside". */
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  const tenses = availableTenses(entry);
  const [tense, setTense] = useState(tenses[0]?.tense ?? "present");
  const [negative, setNegative] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{
    left: number;
    top: number;
    maxHeight: number;
  } | null>(null);
  const titleId = useId();

  // Below the word when there is room, else above; always inside the viewport.
  // Re-run on scroll and resize, since the coordinates are viewport-fixed.
  useLayoutEffect(() => {
    function place() {
      const dialog = dialogRef.current;
      if (!dialog || !anchorEl) return;
      const anchor = anchorEl.getBoundingClientRect();
      const width = dialog.offsetWidth;
      const height = dialog.scrollHeight;
      const left = Math.min(
        Math.max(anchor.left + anchor.width / 2 - width / 2, MARGIN),
        Math.max(MARGIN, window.innerWidth - MARGIN - width),
      );
      const roomBelow = window.innerHeight - anchor.bottom - 2 * MARGIN;
      const roomAbove = anchor.top - 2 * MARGIN;
      const below = height <= roomBelow || roomBelow >= roomAbove;
      const maxHeight = Math.max(120, below ? roomBelow : roomAbove);
      const used = Math.min(height, maxHeight);
      setPlacement({
        left,
        top: below ? anchor.bottom + MARGIN : anchor.top - MARGIN - used,
        maxHeight,
      });
    }
    place();
    window.addEventListener("scroll", place, { capture: true, passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, { capture: true });
      window.removeEventListener("resize", place);
    };
  }, [anchorEl, tense, negative]);

  // Move focus into the popover on open, so a keyboard user lands in it.
  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (dialogRef.current?.contains(target) || anchorEl?.contains(target)) return;
      onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [anchorEl, onClose]);

  return createPortal(
    <div
      ref={dialogRef}
      className={styles.dialog}
      role="dialog"
      tabIndex={-1}
      aria-labelledby={titleId}
      style={
        placement
          ? {
              left: placement.left,
              top: placement.top,
              maxHeight: placement.maxHeight,
            }
          : { visibility: "hidden" }
      }
      onClick={(event) => event.stopPropagation()}
      onPointerEnter={(event) => event.pointerType !== "touch" && onPointerEnter()}
      onPointerLeave={(event) => event.pointerType !== "touch" && onPointerLeave()}
      // Enter on a control here must not reach useAnswerConfirmation's window
      // listener, which would move the lesson on.
      onKeyDown={(event) => {
        if (event.key === "Enter") event.stopPropagation();
      }}
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
          <button key={t.tense} type="button" className={styles.tab} aria-pressed={t.tense === tense} onClick={() => setTense(t.tense)}>
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
    </div>,
    document.body,
  );
}
