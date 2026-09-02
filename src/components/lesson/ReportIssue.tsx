import { useState } from "react";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import { Button } from "../common/Button";
import { EXERCISE_REPORT_REASONS, type ExerciseReportReason } from "../../domain/exerciseReport";
import { submitExerciseReport } from "../../api/exerciseReport";
import styles from "./ReportIssue.module.css";

interface ReportIssueProps {
  /** Cites which lesson part the report is about — see domain/exerciseReport.ts. */
  exerciseTags: string[];
  prompt: string;
}

/** Sits above the wrong-answer feedback row — POST /v1/exercise-reports. */
export function ReportIssue({ exerciseTags, prompt }: ReportIssueProps) {
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
        exercisePrompt: prompt,
        exerciseTags,
        reasons: [...reasons],
        details: reasons.has("other") && details.trim() ? details.trim() : null,
      });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (!open) {
    return (
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
        <FlagOutlinedIcon fontSize="inherit" />
        Report
      </button>
    );
  }

  if (status === "sent") {
    return <p className={styles.sent}>Thanks — we'll look into it.</p>;
  }

  return (
    <div className={styles.panel} role="group" aria-label="Report an issue with this exercise">
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>
          <FlagOutlinedIcon fontSize="inherit" />
          What went wrong?
        </span>
        <button type="button" className={styles.close} aria-label="Close report" onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>

      <div className={styles.options}>
        {EXERCISE_REPORT_REASONS.map(({ value, label }) => (
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
