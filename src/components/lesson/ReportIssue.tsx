import { useState } from "react";
import { Button } from "../common/Button";
import { FlagOutlinedIcon } from "../common/icons";
import { reportReasonsFor, type ExerciseReportContext, type ExerciseReportReason, type ExerciseReportStage } from "../../domain/exerciseReport";
import { submitExerciseReport } from "../../api/exerciseReport";
import styles from "./ReportIssue.module.css";

interface ReportIssueProps {
  /** Cites which exercise the report is about — see domain/exerciseReport.ts. */
  context: ExerciseReportContext;
  /** Which reasons are offered (domain/exerciseReport.ts's reportReasonsFor). */
  stage: ExerciseReportStage;
}

/**
 * Sits above the exercise, or above either answer's feedback row — POST
 * /v1/exercise-reports. It sits beside a live exercise, so it never takes
 * the answer input's focus (the trigger's mousedown), and it keeps its own
 * keystrokes from the exercise's window-level shortcuts: typing in
 * "tell us more" doesn't type the answer, and Enter on "Submit report"
 * doesn't check or advance it.
 */
export function ReportIssue({ context, stage }: ReportIssueProps) {
  const [open, setOpen] = useState(false);
  const [reasons, setReasons] = useState<Set<ExerciseReportReason>>(new Set());
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");

  function toggleReason(reason: ExerciseReportReason) {
    setReasons((prev) => {
      const next = new Set(prev);
      if (next.has(reason)) next.delete(reason);
      else next.add(reason);
      return next;
    });
  }

  async function submit() {
    setStatus("submitting");
    try {
      await submitExerciseReport({
        exercisePrompt: context.prompt,
        exerciseTags: context.exerciseTags,
        reasons: [...reasons],
        details: reasons.has("other") && details.trim() ? details.trim() : null,
        submittedAnswer: context.submittedText ?? null,
        renderType: context.renderType ?? null,
        courseVersion: context.location?.courseVersion ?? null,
        unitKey: context.location?.unitKey ?? null,
        skillKey: context.location?.skillKey ?? null,
        exerciseOrdinal: context.location?.exerciseOrdinal ?? null,
        audioFiles: context.audioFiles ?? [],
      });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className={styles.trigger}
        onMouseDown={(event) => event.preventDefault()}
        onKeyDown={(event) => event.stopPropagation()}
        onClick={() => setOpen(true)}
      >
        <FlagOutlinedIcon />
        Report
      </button>
    );
  }

  if (status === "sent") {
    return <p className={styles.sent}>Thanks — we'll look into it.</p>;
  }

  return (
    <div
      className={styles.panel}
      role="group"
      aria-label="Report an issue with this exercise"
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>
          <FlagOutlinedIcon />
          What went wrong?
        </span>
        <button type="button" className={styles.close} aria-label="Close report" onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>

      <div className={styles.options}>
        {reportReasonsFor(stage).map(({ value, label }) => (
          <label key={value} className={styles.checkbox}>
            <input type="checkbox" checked={reasons.has(value)} onChange={() => toggleReason(value)} />
            {label}
          </label>
        ))}
      </div>

      {reasons.has("other") && (
        <textarea
          className={styles.details}
          placeholder="Tell us more…"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
        />
      )}

      {status === "error" && <p className={styles.error}>Couldn't send that — try again?</p>}

      <div className={styles.actions}>
        <Button
          variant="secondary"
          onClick={() => void submit()}
          disabled={reasons.size === 0 || status === "submitting"}
        >
          {status === "submitting" ? "Sending…" : "Submit report"}
        </Button>
      </div>
    </div>
  );
}
