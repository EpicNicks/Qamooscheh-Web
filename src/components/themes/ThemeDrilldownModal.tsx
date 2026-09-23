import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ancestorsOf, childrenOf, indexThemesById } from "../../domain/themeTree";
import type { ThemeIndexArtifact } from "../../types/content";
import { Button } from "../common/Button";
import { ArrowBackIcon, CloseIcon } from "../common/icons";
// Same overlay/card/portal/focus-trap/Escape shape as DeepDiveChooserModal,
// plus a back arrow — this modal steps through the theme tree one level at a
// time instead of listing everything at once.
import styles from "./ThemeDrilldownModal.module.css";

/**
 * Opened from ThemesPage when a root tag is clicked. Shows ONE tree level at
 * a time — the top of an internal id stack, starting at `rootId`: the
 * node's own "Deep dive from here" (its rolled-up lessons, via the existing
 * `/themes/:themeId` browse page) plus a button per child tag, which pushes
 * that child onto the stack. A node can have both lessons and children, so
 * "Deep dive from here" is always offered, not only at leaves.
 *
 * Chrome: back arrow pops one level (or closes when already at the root);
 * the red × and a backdrop click always close the whole thing.
 *
 * Portalled to document.body for the same reason as DeepDiveChooserModal —
 * never let a transformed ancestor become the fixed overlay's containing
 * block.
 */
export function ThemeDrilldownModal({
  themeIndex,
  rootId,
  onClose,
}: {
  themeIndex: ThemeIndexArtifact;
  rootId: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [stack, setStack] = useState<string[]>([rootId]);
  // Reset to the new root if the caller swaps `rootId` without remounting
  // (ThemesPage also keys on it; this just makes the component safe alone).
  const [stackRootId, setStackRootId] = useState(rootId);
  if (stackRootId !== rootId) {
    setStackRootId(rootId);
    setStack([rootId]);
  }

  const currentId = stack[stack.length - 1];
  const node = indexThemesById(themeIndex.themes).get(currentId) ?? null;
  const children = node ? childrenOf(themeIndex.themes, node.id) : [];
  const trail = node ? ancestorsOf(themeIndex, node.id) : [];

  // Re-runs on EVERY stack change, not just mount: a push/pop swaps out the
  // whole body (the focused child button unmounts), which would otherwise
  // drop focus to <body> and break the Tab trap below until the next click.
  // Skips both chrome buttons so focus lands on the level's primary action.
  useEffect(() => {
    dialogRef.current
      ?.querySelector<HTMLElement>(`button:not(.${styles.close}):not(.${styles.back})`)
      ?.focus();
  }, [stack]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button");
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const inside = dialogRef.current?.contains(document.activeElement) ?? false;
      if (!inside) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function goBack() {
    if (stack.length > 1) setStack((prev) => prev.slice(0, -1));
    else onClose();
  }

  function diveHere() {
    if (!node) return;
    onClose();
    navigate(`/themes/${encodeURIComponent(node.id)}`);
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-drilldown-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.chrome}>
          <button
            type="button"
            className={styles.back}
            aria-label={stack.length > 1 ? "Back to parent topic" : "Close"}
            onClick={goBack}
          >
            <ArrowBackIcon />
          </button>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {trail.length > 1 && (
          <p className={styles.trail}>{trail.slice(0, -1).map((t) => t.id).join(" › ")}</p>
        )}
        <h2 id="theme-drilldown-title" className={styles.title}>
          {node ? node.id : currentId}
        </h2>

        {node ? (
          <>
            <Button variant="deepDive" onClick={diveHere}>
              Deep Dive
            </Button>
            {children.length > 0 && (
              <>
                <p className={styles.body}>Deeper Dives:</p>
                <div className={styles.childList}>
                  {children.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      className={styles.child}
                      onClick={() => setStack((prev) => [...prev, child.id])}
                    >
                      <span className={styles.childName}>{child.id}</span>
                      {childrenOf(themeIndex.themes, child.id).length > 0 && (
                        <span className={styles.childMore} aria-hidden="true">
                          ›
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <p className={styles.body}>This topic isn't available in your current course version.</p>
        )}
      </div>
    </div>,
    document.body,
  );
}
