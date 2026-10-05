import { useState } from "react";
import { Button } from "../../components/common/Button";
import { ErrorBanner } from "../../components/common/ErrorBanner";
import { Spinner } from "../../components/common/Spinner";
import { addDays, formatDayStart, formatStreakDay, formatStreakDays } from "../../domain/streak";
import { useCancelStreakPause, usePauseStreak, useStreak } from "../../hooks/useStreak";
import { errorMessage } from "../../lib/errors";
import type { StreakResponse } from "../../types/api";
import styles from "./SettingsPage.module.css";

/** Mirrors the server's StreakPolicy — the server re-checks both, these only bound the form. */
const MAX_PAUSE_DAYS = 14;
const MAX_PAUSE_LEAD_DAYS = 30;

/**
 * When the streak's day rolls over, and pausing it (POST/DELETE
 * /v1/streak/pause). Account-wide like the streak itself, not a per-course
 * pref, and every action saves on its own — so this is one of the sections the
 * shared Save button skips.
 */
export function StreakSection() {
  const streak = useStreak();

  return (
    <div className={styles.section}>
      <h2>Streak</h2>
      {streak.isLoading && <Spinner label="Loading your streak…" />}
      {streak.isError && <ErrorBanner message={errorMessage(streak.error, "Couldn't load your streak.")} />}
      {streak.data && (
        <>
          <DayStart streak={streak.data} />
          {streak.data.pause ? <ScheduledPause streak={streak.data} /> : <PauseForm streak={streak.data} />}
        </>
      )}
    </div>
  );
}

function DayStart({ streak }: { streak: StreakResponse }) {
  return (
    <div className={styles.field}>
      Day resets at
      <span className={styles.fieldValue}>
        {formatDayStart(streak)} <span className={styles.fieldNote}>({streak.timeZone.replace(/_/g, " ")})</span>
      </span>
      <span className={styles.fieldNote}>
        Practice before then to count today. Your time zone follows this device, so the reset moves with you when you
        travel. If a flight east cuts short a day you hadn't practiced yet, that day is covered for you (up to twice a
        month).
      </span>
    </div>
  );
}

function ScheduledPause({ streak }: { streak: StreakResponse }) {
  const cancel = useCancelStreakPause();
  const pause = streak.pause!;
  const { started } = pause;
  const range =
    pause.startDay === pause.endDay
      ? formatStreakDay(pause.startDay)
      : `${formatStreakDay(pause.startDay)} – ${formatStreakDay(pause.endDay)}`;

  return (
    <div className={styles.field}>
      {started ? "Streak paused" : "Pause scheduled"}
      <span className={styles.fieldValue}>{range}</span>
      <span className={styles.fieldNote}>
        Paused days don't break your streak or add to it. Practicing on a paused day still counts.
        {started && " Ending the pause early still covers today."}
      </span>
      {cancel.isError && <ErrorBanner message={errorMessage(cancel.error, "Couldn't cancel the pause.")} />}
      <div>
        <Button type="button" variant="secondary" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
          {started ? "End pause" : "Cancel pause"}
        </Button>
      </div>
    </div>
  );
}

function PauseForm({ streak }: { streak: StreakResponse }) {
  const pause = usePauseStreak();
  const { today } = streak;
  const maxLength = Math.min(MAX_PAUSE_DAYS, streak.pauseDaysAvailable);
  const [startDay, setStartDay] = useState(today);
  const [length, setLength] = useState(Math.min(7, Math.max(1, maxLength)));

  if (maxLength < 1) {
    return (
      <div className={styles.field}>
        Pause your streak
        <span className={styles.fieldNote}>
          You've used all your pause days for this year. They come back 365 days after each pause.
        </span>
      </div>
    );
  }

  // An emptied date input yields "", which addDays can't parse.
  const endDay = startDay ? addDays(startDay, length - 1) : startDay;

  return (
    // A div, not a <form>: SettingsPage already wraps every section in its
    // shared prefs form, and forms can't nest.
    <div className={styles.section}>
      <label className={styles.field}>
        Pause starts
        <input
          type="date"
          value={startDay}
          min={today}
          max={addDays(today, MAX_PAUSE_LEAD_DAYS)}
          onChange={(e) => setStartDay(e.target.value)}
        />
      </label>
      <label className={styles.field}>
        For
        <select value={length} onChange={(e) => setLength(Number(e.target.value))}>
          {Array.from({ length: maxLength }, (_, i) => i + 1).map((days) => (
            <option key={days} value={days}>
              {formatStreakDays(days)}
            </option>
          ))}
        </select>
        <span className={styles.fieldNote}>
          Going on vacation or taking a break? Paused days won't break your streak.
          {endDay && ` Through ${formatStreakDay(endDay)}.`} {formatStreakDays(streak.pauseDaysAvailable)} of pause
          left this year.
        </span>
      </label>
      {pause.isError && <ErrorBanner message={errorMessage(pause.error, "Couldn't pause your streak.")} />}
      <div>
        <Button
          type="button"
          variant="secondary"
          disabled={pause.isPending || !startDay}
          onClick={() => pause.mutate({ startDay, endDay })}
        >
          Pause streak
        </Button>
      </div>
    </div>
  );
}
