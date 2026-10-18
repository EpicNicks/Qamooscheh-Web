import type { ActorRenderProps } from "../actor";
import type { RepackBoxState } from "./repackBox";
import styles from "./RepackBox.module.css";

export function RepackBoxFallback({ state, speed, still }: ActorRenderProps<RepackBoxState>) {
  return (
    <svg
      className={[styles.box, styles[state]].join(" ")}
      style={{ "--speed": speed } as React.CSSProperties}
      data-still={still || undefined}
      viewBox="0 0 200 180"
      aria-hidden="true"
    >
      <rect className={styles.back} x="30" y="70" width="140" height="95" rx="8" />
      <g className={styles.dropper}>
        <rect className={styles.chip} x="86" y="30" width="28" height="22" rx="4" />
      </g>
      <rect className={styles.front} x="30" y="92" width="140" height="73" rx="8" />
      <g className={styles.lid}>
        <rect className={styles.lidPanel} x="22" y="52" width="156" height="22" rx="6" />
      </g>
    </svg>
  );
}
