// Split from GraderProvider.tsx for the reason auth/AuthContext.ts is split
// from auth/AuthProvider.tsx (Fast Refresh).
import { createContext } from "react";
import type { Grader } from "./types";

/**
 * - `none`: the course has no published browser grader (or this build shipped none for its language), so there is nothing to wait for (answers get the plain exact-match check, lib/textMatch.ts).
 * - `loading`: not started yet, or starting.
 * - `ready`: grading and XP come from `grader`.
 * - `unavailable`: the shipped grader could not be loaded or cached (offline before its first load).
 */
export type GraderState =
  | { status: "none" }
  | { status: "loading" }
  | { status: "ready"; grader: Grader }
  | { status: "unavailable"; offline: boolean };

export interface GraderContextValue {
  state: GraderState;
  /** Starts loading now rather than at idle, and tries again after a failure. */
  ensure: () => void;
}

export const GraderContext = createContext<GraderContextValue | null>(null);
