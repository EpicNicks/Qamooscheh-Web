import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./LanguageSettingsPopover.module.css";

interface LanguageSettingsPopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Hovers just below the settings cog, portalled to document.body — same
 * reasoning as path/LessonStartPopover.tsx's own portal: an ancestor
 * elsewhere in the lesson chrome could carry a transform, which would turn
 * `position: fixed` into "fixed relative to that box" instead of the
 * viewport in every modern browser.
 */
export function LanguageSettingsPopover({ anchorEl, onClose, children }: LanguageSettingsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorEl?.contains(target)) return; // the cog's own click already toggles open/closed
      onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [onClose, anchorEl]);

  // Open focused on the panel's first control and hand focus back to the cog
  // on close — the popover mounts only while it's open (see
  // LanguageSettingsButton), so mount/unmount IS open/close here. Without
  // this, Escape or a click outside leaves focus on nothing and a keyboard
  // user's next Tab restarts from the top of the document.
  useEffect(() => {
    popoverRef.current?.querySelector<HTMLElement>("button, input, select, textarea, [tabindex]")?.focus();
    return () => anchorEl?.focus();
  }, [anchorEl]);

  if (!anchorEl) return null;

  const rect = anchorEl.getBoundingClientRect();
  const style: CSSProperties = {
    position: "fixed",
    top: rect.bottom + 8,
    right: window.innerWidth - rect.right,
  };

  return createPortal(
    <div ref={popoverRef} className={styles.popover} style={style} role="dialog" aria-label="Script settings">
      {children}
    </div>,
    document.body,
  );
}
