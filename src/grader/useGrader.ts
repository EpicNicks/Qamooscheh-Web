import { useContext, useEffect } from "react";
import { GraderContext, GraderHoldContext, type GraderContextValue } from "./GraderContext";
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

/** While `held`, RequireGrader keeps the calling lesson mounted whatever the grader state does (a lesson with a pinned grader must not be unmounted by a language change). */
export function useHoldGrader(held: boolean): void {
  const hold = useContext(GraderHoldContext);
  useEffect(() => {
    if (!held || !hold) return;
    return hold();
  }, [held, hold]);
}
