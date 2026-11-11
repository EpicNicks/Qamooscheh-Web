import type { ActorRenderProps } from "../actor";
import type { ParcelState } from "./parcel";
import styles from "./Parcel.module.css";

export function ParcelFallback({ state, speed, slots, still }: ActorRenderProps<ParcelState>) {
  return (
    <svg
      className={[styles.parcel, styles[state]].join(" ")}
      style={{ "--speed": speed } as React.CSSProperties}
      data-still={still || undefined}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <g className={styles.body}>
        <rect className={styles.box} x="14" y="30" width="72" height="56" rx="6" />
        <path className={styles.shade} d="M14 30 H86 V42 H14 Z" />
        <rect className={styles.tape} x="44" y="30" width="12" height="56" />
        <g className={styles.bow}>
          <ellipse className={styles.tape} cx="39" cy="26" rx="11" ry="7" />
          <ellipse className={styles.tape} cx="61" cy="26" rx="11" ry="7" />
          <circle className={styles.knot} cx="50" cy="28" r="5" />
        </g>
        {slots.tag && (
          <text className={styles.tag} x="50" y="72" textAnchor="middle" fontSize="26">
            {slots.tag}
          </text>
        )}
      </g>
      {state === "done" || state === "celebrate" ? <path className={styles.check} d="M38 56 L47 65 L64 46" /> : null}
    </svg>
  );
}
