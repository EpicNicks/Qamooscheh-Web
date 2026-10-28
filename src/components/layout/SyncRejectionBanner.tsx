import { describeRejectionReason } from "../../domain/rejectionReason";
import type { SyncRejection } from "../../lib/syncRejections";
import { Button } from "../common/Button";
import styles from "./SyncRejectionBanner.module.css";

interface SyncRejectionBannerProps {
  rejections: SyncRejection[];
  onDismiss: () => void;
}

/** Parsles finished offline that the server refused on sync — kept until the learner dismisses them. */
export function SyncRejectionBanner({ rejections, onDismiss }: SyncRejectionBannerProps) {
  if (rejections.length === 0) return null;
  const reason = rejections.map((r) => describeRejectionReason(r.reason)).find((text) => text !== null);
  const message =
    rejections.length === 1
      ? "A Parsle you finished offline wasn't saved, so it won't count toward your review schedule."
      : `${rejections.length} Parsles you finished offline weren't saved, so they won't count toward your review schedule.`;
  return (
    <div className={styles.banner} role="status">
      <p className={styles.text}>{reason ? `${message} ${reason}` : message}</p>
      <Button variant="secondary" onClick={onDismiss} aria-label="Dismiss this notice">
        Dismiss
      </Button>
    </div>
  );
}
