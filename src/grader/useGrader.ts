import { useContext } from "react";
import { GraderContext, type GraderContextValue } from "./GraderContext";
import type { Grader } from "./types";

export function useGraderState(): GraderContextValue {
  const ctx = useContext(GraderContext);
  if (!ctx) throw new Error("useGraderState must be used within a GraderProvider");
  return ctx;
}

/** The loaded grader, or null when there isn't one (yet): a course without a published grader, or one still loading. RequireGrader keeps lesson screens from rendering in the second case. */
export function useGrader(): Grader | null {
  const { state } = useGraderState();
  return state.status === "ready" ? state.grader : null;
}
