import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { stowLesson } from "../../api/stow";
import { ApiError } from "../../api/httpClient";
import { useAuth } from "../../auth/useAuth";
import { stowRefusalMessage } from "../../domain/stowage";
import { flushQueueNow } from "../../lib/flushQueueNow";
import { loadQueue } from "../../lib/offlineQueue";
import { setCachedStowage } from "../../lib/stowageCache";
import { emitStowEvent } from "../../lib/stowEvents";
import { Button } from "../common/Button";
import { StowDialog } from "./StowDialog";
import { STOW_COPY } from "./stowCopy";
import styles from "./StowDialog.module.css";

type Stage = "confirm" | "working" | "stowed" | "declined" | "refused";

interface StowFlowProps {
  lessonKey: string;
  /** Starts the lesson that was tapped — "Retry Lesson" after declining. */
  onRetry: () => void;
  onClose: () => void;
}

/**
 * The Stow dialogs (ledger: stow-dialogs). A confirmation explaining what
 * stowing does; Stow then shows an encouraging popup with Continue, Not now an
 * encouraging "You got this!" with Close and Retry Lesson. Stowing is
 * online-only (stow-online-only): queued results are sent first, because the
 * server judges the cursor and the failed attempt on record.
 */
export function StowFlow({ lessonKey, onRetry, onClose }: StowFlowProps) {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const [stage, setStage] = useState<Stage>("confirm");
  const [error, setError] = useState<string | null>(null);

  async function stow() {
    if (!userId) return;
    setStage("working");
    setError(null);
    try {
      await flushQueueNow(userId, queryClient);
      // A result this page is still sending (or that the server hasn't taken)
      // would race the stow; ask to try again rather than guess.
      if (loadQueue(userId).length > 0) {
        setError("Your recent results are still syncing. Try again in a moment.");
        setStage("confirm");
        return;
      }
      const response = await stowLesson(lessonKey, { asUserId: userId });
      setCachedStowage(queryClient, response.stowage, response.position);
      for (const key of ["bootstrap", "sessionPlan"]) queryClient.invalidateQueries({ queryKey: [key] });
      if (response.applied) emitStowEvent("stowCommitted", lessonKey);
      setStage("stowed");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status >= 400 && caught.status < 500 && caught.status !== 429) {
        // The server no longer agrees this can be stowed; show it the real state.
        queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
        setError(stowRefusalMessage(caught.body?.reason));
        setStage("refused");
        return;
      }
      setError("Couldn't stow that Parsle. Stowing needs a connection. Check yours and try again.");
      setStage("confirm");
    }
  }

  if (stage === "stowed") {
    return (
      <StowDialog title={STOW_COPY.stowedTitle} titleId="stow-done-title" onDismiss={onClose}>
        <p className={styles.body}>{STOW_COPY.stowedBody}</p>
        <div className={styles.actions}>
          <Button onClick={onClose}>{STOW_COPY.stowedAction}</Button>
        </div>
      </StowDialog>
    );
  }

  if (stage === "declined") {
    return (
      <StowDialog title={STOW_COPY.declinedTitle} titleId="stow-declined-title" onDismiss={onClose}>
        <p className={styles.body}>{STOW_COPY.declinedBody}</p>
        <div className={styles.actions}>
          <Button
            onClick={() => {
              onClose();
              onRetry();
            }}
          >
            {STOW_COPY.declinedRetry}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {STOW_COPY.declinedClose}
          </Button>
        </div>
      </StowDialog>
    );
  }

  if (stage === "refused") {
    return (
      <StowDialog title={STOW_COPY.confirmTitle} titleId="stow-refused-title" onDismiss={onClose}>
        <p className={styles.error} role="alert">
          {error}
        </p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            {STOW_COPY.declinedClose}
          </Button>
        </div>
      </StowDialog>
    );
  }

  return (
    <StowDialog title={STOW_COPY.confirmTitle} titleId="stow-confirm-title" onDismiss={onClose}>
      <p className={styles.body}>{STOW_COPY.confirmBody}</p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button onClick={() => void stow()} disabled={stage === "working"}>
          {STOW_COPY.confirmAction}
        </Button>
        <Button variant="secondary" onClick={() => setStage("declined")} disabled={stage === "working"}>
          {STOW_COPY.confirmDecline}
        </Button>
      </div>
    </StowDialog>
  );
}
