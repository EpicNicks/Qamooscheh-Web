import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { muteStowage, snoozeStowage } from "../../api/stow";
import { findPathSkill, type PathUnit } from "../../domain/pathProgress";
import { skillStartRoute } from "../../domain/skillRoute";
import { hasReadyPrompt } from "../../domain/stowage";
import { useBootstrap } from "../../hooks/useBootstrap";
import { useLocalAppPref } from "../../hooks/useLocalAppPref";
import { setCachedStowage } from "../../lib/stowageCache";
import { emitStowEvent } from "../../lib/stowEvents";
import { Button } from "../common/Button";
import { StowDialog } from "./StowDialog";
import { STOW_COPY } from "./stowCopy";
import styles from "./StowDialog.module.css";
import listStyles from "./StowReminderModal.module.css";

/**
 * The ready-to-retry reminder (ledger: stow-reminder-trigger, -pref, -mute).
 * Up when the server says any stowed Parsle is due (`readyPromptDue`) and this
 * device's Stow reminders pref is on. Lists the whole Stowage in the server's
 * order (units descending, lessons in path order). Not yet snoozes, the X
 * mutes the lessons stowed so far; neither touches the pref, and neither
 * removes a Parsle: only a pass does.
 */
export function StowReminderModal({ path }: { path: PathUnit[] }) {
  const bootstrap = useBootstrap();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [remindersOn] = useLocalAppPref("stowReminders", true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stowage = bootstrap.data?.stowage ?? [];
  const open = remindersOn && hasReadyPrompt(stowage);

  useEffect(() => {
    if (open) emitStowEvent("readyPromptShown");
  }, [open]);

  if (!open) return null;

  async function answer(request: typeof snoozeStowage) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await request();
      setCachedStowage(queryClient, response.stowage);
      void queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
    } catch {
      setError("Couldn't save that. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <StowDialog
      title={STOW_COPY.reminderTitle}
      titleId="stow-reminder-title"
      showClose
      // The X is a synced mute, so it must be a deliberate tap; Escape is the
      // gentler "Not yet".
      onDismiss={() => void answer(muteStowage)}
      onEscape={() => void answer(snoozeStowage)}
    >
      <p className={styles.body}>{STOW_COPY.reminderBody}</p>
      <div className={listStyles.units}>
        {stowage.map((unit) => (
          <section key={unit.unitKey}>
            <h3 className={listStyles.unitTitle}>{path.find((u) => u.unitKey === unit.unitKey)?.title ?? unit.unitKey}</h3>
            <ul className={listStyles.lessons}>
              {unit.lessons.map((lesson) => {
                const found = findPathSkill(path, unit.unitKey, lesson.lessonKey);
                return (
                  <li key={lesson.lessonKey} className={listStyles.lesson}>
                    <span className={listStyles.lessonTitle}>{found?.skill.title ?? lesson.lessonKey}</span>
                    {found && (
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() => {
                          emitStowEvent("stowResumed", lesson.lessonKey);
                          navigate(skillStartRoute(found.skill, found.siblings));
                        }}
                      >
                        Start Parsle
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button variant="secondary" disabled={busy} onClick={() => void answer(snoozeStowage)}>
          {STOW_COPY.reminderNotYet}
        </Button>
      </div>
    </StowDialog>
  );
}
