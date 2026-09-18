import type { ReactNode, RefObject } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { CloseIcon } from "../common/icons";
import styles from "./NavDrawer.module.css";

interface NavDrawerProps {
  id: string;
  isOpen: boolean;
  panelRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onSignOut: () => void;
  children: ReactNode;
}

/**
 * The mobile off-canvas nav: a scrim + sliding panel carrying the brand (its
 * new home now that the header hides it at this width — AppShell.module.css),
 * the course-content links (children, a `<Sidebar variant="drawer">`), and
 * Sign out (relocated here from the header, where it doesn't fit at 360px).
 *
 * Rendered INLINE, not portalled — it has to stay inside AppShell's own
 * `.shell` to inherit `--header-height`, and `position: fixed` resolves
 * against the viewport here because nothing in AppShell carries a transform
 * (unlike SkillRoad's `.nodeWrap`, which is why popovers elsewhere portal).
 *
 * The scrim renders whenever mobile, not gated on isOpen, so its opacity can
 * transition in both directions; `inert` (not `visibility: hidden`) removes
 * the closed panel from the tab order and a11y tree while leaving it
 * paintable for the slide-out animation.
 */
export function NavDrawer({ id, isOpen, panelRef, onClose, onSignOut, children }: NavDrawerProps) {
  useFocusTrap(panelRef, { enabled: isOpen, onEscape: onClose });

  return (
    <>
      <div className={styles.scrim} data-open={isOpen ? "" : undefined} aria-hidden="true" onClick={onClose} />
      <aside
        id={id}
        ref={panelRef}
        className={styles.panel}
        data-open={isOpen ? "" : undefined}
        inert={!isOpen || undefined}
        aria-label="Navigation"
      >
        <div className={styles.panelHeader}>
          <span className={styles.brand}>ParsLing</span>
          <button type="button" className={styles.panelClose} aria-label="Close navigation" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        {children}
        <button type="button" className={styles.signOut} onClick={onSignOut}>
          Sign out
        </button>
      </aside>
    </>
  );
}
