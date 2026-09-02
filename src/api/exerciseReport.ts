// v1/exercise-reports — ExerciseReportsController.cs. courseCode is resolved
// server-side from the caller's active course; this only ever sends what
// ReportIssue.tsx actually collects.
import { apiFetch } from "./httpClient";
import type { SubmitExerciseReportRequest, SubmitExerciseReportResponse } from "../types/api";

export function submitExerciseReport(request: SubmitExerciseReportRequest): Promise<SubmitExerciseReportResponse> {
  return apiFetch<SubmitExerciseReportResponse>("/v1/exercise-reports", { method: "POST", body: request });
}
