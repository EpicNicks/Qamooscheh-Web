import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { CloseIcon } from "../common/icons";
import styles from "./StowDialog.module.css";

interface StowDialogProps {
  title: string;
  titleId: string;
  /** The X, when `showClose` is set; also Escape unless `onEscape` says otherwise. */
  onDismiss: () => void;
  onEscape?: () => void;
  showClose?: boolean;
  children: ReactNode;
}

/**
 * The chrome the Stow dialogs share: overlay, centred card, focus trap and
 * Escape. Portalled to document.body for the reason DeepDiveChooserModal
 * documents — the path's `.nodeWrap` is a transformed ancestor, which would
 * otherwise become the containing block of this `position: fixed` overlay.
 * The overlay is not click-to-dismiss: a stray tap must not answer a question
 * about deferring a Parsle.
 */
export function StowDialog({ title, titleId, onDismiss, onEscape, showClose = false, children }: StowDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, { enabled: true, onEscape: onEscape ?? onDismiss });

  // Opens on the first real action rather than the X.
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>("button:not([data-dismiss])")?.focus();
  }, []);

  return createPortal(
    <div className={styles.overlay}>
      <div ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        {showClose && (
          <button type="button" className={styles.close} data-dismiss aria-label="Close" onClick={onDismiss}>
            <CloseIcon />
          </button>
        )}
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
