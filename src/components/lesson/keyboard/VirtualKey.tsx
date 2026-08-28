import { useState, type PointerEvent, type ReactNode } from "react";
import styles from "./Keyboard.module.css";

export interface VirtualKeyProps {
  label: ReactNode;
  onActivate: () => void;
  /** Whether the physical key this maps to (per usePhysicalKeyState) is currently held — lights the key up the same as tapping it. */
  physicalDown?: boolean;
  wide?: boolean;
  disabled?: boolean;
  className?: string;
  title?: string;
}

/**
 * One keyboard key with press/hold/release animation states, shared by every
 * on-screen keyboard variant (Persian layout/phonetic, Japanese phonetic/
 * kana). `pressed` covers both "pressed" and "held" — it's simply on for the
 * duration of the pointer (or physical key) being down; `released` is a
 * transient bounce fired on release, cleared via onAnimationEnd rather than
 * a timer so it can never desync from the actual CSS animation duration.
 */
export function VirtualKey({ label, onActivate, physicalDown, wide, disabled, className, title }: VirtualKeyProps) {
  const [pointerDown, setPointerDown] = useState(false);
  const [justReleased, setJustReleased] = useState(false);

  const pressed = pointerDown || !!physicalDown;

  function release() {
    if (!pointerDown) return;
    setPointerDown(false);
    setJustReleased(true);
  }

  function activate(event: PointerEvent<HTMLButtonElement>) {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setPointerDown(true);
    onActivate();
  }

  const classes = [styles.key, wide && styles.wide, pressed && styles.pressed, justReleased && styles.released, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      title={title}
      disabled={disabled}
      // Tapping a virtual key must never move focus off the answer input —
      // preventDefault on mousedown is the standard, cross-browser way to
      // stop a <button> from stealing focus (the click/activation itself
      // still fires normally via onPointerDown below).
      onMouseDown={(event) => event.preventDefault()}
      onPointerDown={activate}
      onPointerUp={release}
      onPointerCancel={release}
      onAnimationEnd={() => setJustReleased(false)}
    >
      {label}
    </button>
  );
}
