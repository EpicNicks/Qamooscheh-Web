import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { PathSkill, PositionKey } from "../../domain/pathProgress";
import type { ThemeIndexArtifact } from "../../types/content";
import { usePathTheme } from "../../theme/PathThemeContext";
import { useListNavigation } from "../../hooks/useListNavigation";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { flipFromOrigin } from "../../lib/flipFromOrigin";
import { Button } from "../common/Button";
import { CloseIcon } from "../common/icons";
import { useSkillActions } from "./useSkillActions";
import styles from "./SkillGroupModal.module.css";

interface SkillGroupModalProps {
  /** Every alternate at the tapped position. All share one status (pathProgress.ts). */
  skills: PathSkill[];
  /** Passed straight through to useSkillActions; only meaningful when the position is "current". */
  nextSkipTarget: PositionKey | null;
  /** The composite node this opened from — the FLIP animation's start rect, and where focus returns. */
  originRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  /** Opens the Deep Dive chooser for the currently-active alternate, after this modal's own close animation finishes — see requestClose's `then` param. */
  onDeepDive: (skillKey: string) => void;
  themeIndex?: ThemeIndexArtifact | null;
}

/**
 * The mobile stand-in for a fork of standard skills: SkillRoad collapses a
 * forked position into one SkillGroupNode on a phone (real cards are too
 * narrow to fan out legibly there), and tapping it opens this — a vertical,
 * scrollable list of the position's alternates on the left, with the same
 * start/test-out/review-vocab actions LessonStartPopover offers on the right
 * (via the shared useSkillActions hook, so the two surfaces can't diverge).
 *
 * Portalled to document.body — mandatory, for the reason LessonStartPopover
 * documents at length: SkillRoad.module.css's `.nodeWrap` carries
 * `transform: translateY(-50%)`, and a transformed ancestor becomes the
 * containing block for `position: fixed` descendants, so an in-place overlay
 * would size itself to the node's own small box instead of the viewport.
 */
export function SkillGroupModal({ skills, nextSkipTarget, originRef, onClose, onDeepDive, themeIndex }: SkillGroupModalProps) {
  const theme = usePathTheme();
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Captured ONCE, before anything animates — re-measuring later would read
  // the node mid-scroll (or after it's gone, once the modal has unmounted it
  // via a collapse-state flip elsewhere on the page).
  const originRectRef = useRef<DOMRect | null>(null);
  if (originRectRef.current === null) originRectRef.current = originRef.current?.getBoundingClientRect() ?? null;

  const actionsRef = useRef<ReturnType<typeof useSkillActions> | null>(null);
  const listNav = useListNavigation(skills.length, () => actionsRef.current?.onPrimary());
  const activeSkill = skills[listNav.activeIndex] ?? null;
  const actions = useSkillActions(activeSkill, nextSkipTarget, themeIndex);
  actionsRef.current = actions;

  /**
   * `then` defaults to `onClose` (the Cancel/×/overlay-click path) but the
   * Deep Dive button passes its own so the chooser modal opens only once
   * this one has actually finished animating away, rather than the two
   * dialogs briefly overlapping.
   */
  function requestClose(then: () => void = onClose) {
    const anim = dialogRef.current && flipFromOrigin(dialogRef.current, originRectRef.current, { direction: "reverse" });
    overlayRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" });
    if (!anim) {
      then();
      return;
    }
    // .finally, not .then: a cancelled animation rejects, and a cancelled
    // close must still close (otherwise Escape during the open animation
    // strands the dialog on screen).
    void anim.finished.finally(then);
  }

  useFocusTrap(dialogRef, { enabled: true, onEscape: () => requestClose() });

  useLayoutEffect(() => {
    listRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const anim = flipFromOrigin(dialog, originRectRef.current);
    overlayRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: "none" });
    // StrictMode double-invokes this in dev; without the cancel you get two
    // overlapping WAAPI animations on every open.
    return () => anim?.cancel();
  }, []);

  // Restores focus to the node this opened from — captured now, in case it's
  // since been unmounted (navigating away via one of the action buttons),
  // same reasoning LessonStartPopover's own restore-focus effect gives.
  useEffect(() => {
    const opener = originRef.current;
    return () => opener?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- originRef is a ref, stable by definition; this is a mount/unmount effect only.
  }, []);

  return createPortal(
    <div ref={overlayRef} className={styles.overlay} onClick={() => requestClose()}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="skill-group-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.close} aria-label="Close" onClick={() => requestClose()}>
          <CloseIcon />
        </button>
        <h2 id="skill-group-title" className={styles.title}>
          Choose a lesson
        </h2>

        <div className={styles.columns}>
          <ul
            ref={listRef}
            className={styles.list}
            role="listbox"
            aria-label="Lessons at this step"
            tabIndex={0}
            aria-activedescendant={listNav.activeIndex >= 0 ? `skill-option-${listNav.activeIndex}` : undefined}
            onKeyDown={listNav.onKeyDown}
          >
            {skills.map((s, i) => (
              <li
                key={s.skillKey}
                id={`skill-option-${i}`}
                role="option"
                aria-selected={i === listNav.activeIndex}
                className={i === listNav.activeIndex ? `${styles.row} ${styles.rowActive}` : styles.row}
                onClick={() => listNav.setActiveIndex(i)}
              >
                <span className={styles.rowIcon} aria-hidden="true">
                  {theme.icons[s.category]}
                </span>
                <span className={styles.rowTitle}>{s.title}</span>
              </li>
            ))}
          </ul>

          <div className={styles.actions}>
            <Button className={styles.action} onClick={actions.onPrimary}>
              {actions.primaryLabel}
            </Button>
            {actions.hasDeepDive && activeSkill && (
              <Button
                className={styles.action}
                variant="deepDive"
                onClick={() => requestClose(() => onDeepDive(activeSkill.skillKey))}
              >
                Deep Dive
              </Button>
            )}
            {actions.onSkip && (
              <Button
                className={styles.action}
                variant="secondary"
                onClick={actions.onSkip}
                title="Complete a shorter quiz instead of the full lesson to advance"
              >
                Test out
              </Button>
            )}
            <Button className={styles.action} variant="secondary" onClick={actions.onReviewVocabulary}>
              Review vocabulary
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
