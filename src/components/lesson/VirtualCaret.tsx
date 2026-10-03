import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import styles from "./Exercise.module.css";

interface VirtualCaretProps {
  /** The answer input it stands in for — read for its scroll position and box. */
  inputRef: RefObject<HTMLInputElement | null>;
  /** The positioned wrapper both the input and this caret sit in (TypeInExercise's .inputWrap). */
  wrapRef: RefObject<HTMLDivElement | null>;
  /** The input's text up to the caret — where the bar goes. */
  textBeforeCaret: string;
  dir: "ltr" | "rtl" | undefined;
  /** Must match the input's own font-family exactly, or the measurement is of the wrong glyphs. */
  fontFamily: string | undefined;
}

/**
 * A blinking caret drawn where the answer input's own caret would be, for
 * when the input doesn't have focus (issue #24). With an on-screen keyboard
 * the input keeps working unfocused — every key reaches it through
 * TypeInExercise's window-level handler — but the browser only draws a caret
 * in a focused field, so without this there's nothing showing where the next
 * letter will land. Render it only while the input is unfocused; it never
 * takes pointer events, so a tap still lands on the input and focuses it.
 *
 * Measured the same way the phonetic candidate picker is placed
 * (keyboard/scriptEngines.tsx): an invisible twin of the input, same class
 * and font, holds the text up to the caret and a marker after it, and the
 * marker's position is where the caret goes — less however far the input
 * has scrolled its text sideways.
 */
export function VirtualCaret({ inputRef, wrapRef, textBeforeCaret, dir, fontFamily }: VirtualCaretProps) {
  const markerRef = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState<CSSProperties | null>(null);
  // Bumped when the layout can change without the text changing: the wrapper
  // resizing (rotation, a wrapping row above), or a web font finishing load.
  const [layoutVersion, setLayoutVersion] = useState(0);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const bump = () => setLayoutVersion((v) => v + 1);
    const observer = new ResizeObserver(bump);
    observer.observe(wrap);
    void document.fonts?.ready.then(bump);
    return () => observer.disconnect();
  }, [wrapRef]);

  useLayoutEffect(() => {
    const input = inputRef.current;
    const wrap = wrapRef.current;
    const marker = markerRef.current;
    if (!input || !wrap || !marker) return;
    const wrapRect = wrap.getBoundingClientRect();
    const inputRect = input.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const style = getComputedStyle(input);
    const contentLeft = inputRect.left - wrapRect.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
    const contentRight = inputRect.right - wrapRect.left - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
    // Keep the bar inside the text box when the text is wider than it and
    // the input has scrolled to show its other end.
    const x = Math.min(Math.max(markerRect.left - wrapRect.left - input.scrollLeft, contentLeft), contentRight);
    setPosition({ left: x, top: markerRect.top - wrapRect.top, height: markerRect.height });
  }, [inputRef, wrapRef, textBeforeCaret, dir, fontFamily, layoutVersion]);

  return (
    <>
      <span className={`${styles.input} ${styles.mirror}`} aria-hidden="true" dir={dir} style={fontFamily ? { fontFamily } : undefined}>
        {textBeforeCaret}
        {/* A zero-width space gives the marker a line box to measure even when nothing's typed. */}
        <span ref={markerRef}>{"​"}</span>
      </span>
      {position && <span className={styles.virtualCaret} style={position} aria-hidden="true" />}
    </>
  );
}
