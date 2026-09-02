// No backend endpoint exists yet for exercise reports (there's no
// POST /v1/exercise-reports or equivalent in API_SPEC.md). This stub keeps
// components/lesson/ReportIssue.tsx fully wired end-to-end — swap the body
// below for a real apiFetch call (see api/sessionSubmit.ts) once the server
// side exists.
import type { ExerciseReportPayload } from "../domain/exerciseReport";

export function submitExerciseReport(payload: ExerciseReportPayload): Promise<void> {
  console.info("[exercise report] no backend yet — would submit:", payload);
  return Promise.resolve();
}
