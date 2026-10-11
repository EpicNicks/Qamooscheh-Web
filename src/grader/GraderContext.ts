// Split from GraderProvider.tsx for the reason auth/AuthContext.ts is split
// from auth/AuthProvider.tsx (Fast Refresh).
import { createContext } from "react";
import type { Grader } from "./types";

/**
 * - `none`: the course has no published browser grader, so there is nothing to wait for (answers get the plain exact-match check, lib/textMatch.ts).
 * - `loading`: not started yet, or downloading / starting.
 * - `ready`: grading and XP come from `grader`.
 * - `unavailable`: no grader could be loaded and none is cached (offline on a first visit).
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
