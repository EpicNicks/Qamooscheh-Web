import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import styles from "./JumpToCurrentButton.module.css";

type Edge = "top" | "bottom";

/**
 * A round floating button that scrolls the journey back to the current
 * lesson, shown only while that node is off screen. It always sits in the
 * bottom-right corner of the road's column; the arrow points up or down
 * toward the edge the node went off past, so it doubles as a hint for which
 * direction it's in.
 *
 * `watchKey` changes whenever the road re-renders with a (possibly)
 * different current node, so the observer re-finds it.
 */
export function JumpToCurrentButton({ containerRef, watchKey }: { containerRef: RefObject<HTMLElement | null>; watchKey: unknown }) {
  const [edge, setEdge] = useState<Edge | null>(null);
  // Fixed positioning is relative to the viewport, but the button belongs in
  // the road column's corner, which on a wide screen sits well inside the
  // viewport's right edge. Tracked rather than read once: the column moves on
  // resize. clientWidth, not innerWidth, so a scrollbar isn't counted.
  const [rightGap, setRightGap] = useState<number | null>(null);

  useEffect(() => {
    const node = document.querySelector("[data-current-node]");
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setEdge(null);
      else setEdge(entry.boundingClientRect.top < 0 ? "top" : "bottom");
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      // The next node (if any) reports its own state as soon as it's
      // observed; without this, a journey with no current node left would
      // keep the last one's button.
      setEdge(null);
    };
  }, [watchKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      setRightGap(document.documentElement.clientWidth - container.getBoundingClientRect().right);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef]);

  if (!edge) return null;

  return (
    <button
      type="button"
      className={`${styles.button} ${edge === "bottom" ? styles.down : ""}`}
      style={rightGap === null ? undefined : ({ "--jump-right": `${rightGap}px` } as CSSProperties)}
      aria-label="Jump to current lesson"
      title="Jump to current lesson"
      onClick={() => document.querySelector("[data-current-node]")?.scrollIntoView({ block: "center", behavior: "smooth" })}
    >
      <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 L21 12.5 H15.5 V21 H8.5 V12.5 H3 Z" />
      </svg>
    </button>
  );
}
