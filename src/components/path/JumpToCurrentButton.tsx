import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import styles from "./JumpToCurrentButton.module.css";

type Edge = "top" | "bottom";

/**
 * A round floating button that scrolls the journey back to the current
 * lesson, shown only while that node is off screen. It floats at the edge
 * the node went off past, with the arrow pointing that way, so it doubles
 * as a hint for which direction the current lesson is in.
 *
 * `watchKey` changes whenever the road re-renders with a (possibly)
 * different current node, so the observer re-finds it.
 */
export function JumpToCurrentButton({ containerRef, watchKey }: { containerRef: RefObject<HTMLElement | null>; watchKey: unknown }) {
  const [edge, setEdge] = useState<Edge | null>(null);
  // Fixed positioning is relative to the viewport, but the button belongs
  // centered over the road's column, which is offset by the sidebar on
  // desktop. Tracked rather than read once: the column moves on resize.
  const [centerX, setCenterX] = useState<number | null>(null);

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
      const rect = container.getBoundingClientRect();
      setCenterX(rect.left + rect.width / 2);
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
      className={`${styles.button} ${edge === "top" ? styles.top : styles.bottom}`}
      style={centerX === null ? undefined : ({ "--jump-x": `${centerX}px` } as CSSProperties)}
      onClick={() => document.querySelector("[data-current-node]")?.scrollIntoView({ block: "center", behavior: "smooth" })}
    >
      <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 L21 12.5 H15.5 V21 H8.5 V12.5 H3 Z" />
      </svg>
      <span className={styles.label}>Jump to current lesson</span>
    </button>
  );
}
