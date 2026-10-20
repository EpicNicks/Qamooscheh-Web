import type { ClozeResult } from "./cloze";
import type { RaceDeviceClass, RaceMode, RaceScope } from "../types/api";

// The race rules the device needs while a run is on screen (backend RaceRules,
// docs/repack-race.md). The server recomputes the score at finish; this is only
// so the strike meter and the running score are right as it plays.

export const MAX_STRIKES = 3;

/** A strike is a card not answered correctly on attempt 1. */
export function isStrike(result: ClozeResult): boolean {
  return !(result.correct && result.attempt === 1);
}

export function strikes(results: readonly ClozeResult[]): number {
  return results.filter(isStrike).length;
}

/** Perfect Delivery ends at the 3rd strike; Endless Practice only when the learner stops. */
export function ended(mode: RaceMode, results: readonly ClozeResult[]): boolean {
  return mode === "perfect_delivery" && strikes(results) >= MAX_STRIKES;
}

/** The sum of the issued weights of the solved cards (right on any attempt). */
export function score(results: readonly ClozeResult[], weights: Readonly<Record<string, number>>): number {
  return results.filter((r) => r.correct).reduce((sum, r) => sum + (weights[r.tag] ?? 0), 0);
}

export function solved(results: readonly ClozeResult[]): number {
  return results.filter((r) => r.correct).length;
}

/** Only words the server weighted may be dealt; a tag it did not weight is not a learned word. */
export function dealable<T>(cards: readonly T[], tagOf: (card: T) => string, weights: Readonly<Record<string, number>>): T[] {
  return cards.filter((card) => tagOf(card) in weights);
}

/** A run's time as the boards show it: `m:ss`, or `m:ss.t` with tenths. */
export function clock(ms: number, tenths = false): string {
  const total = Math.max(0, Math.floor(ms));
  const base = `${Math.floor(total / 60_000)}:${String(Math.floor(total / 1000) % 60).padStart(2, "0")}`;
  return tenths ? `${base}.${Math.floor(total / 100) % 10}` : base;
}

/** A weight total as a score: one decimal. */
export function scoreText(value: number): string {
  return value.toFixed(1);
}

/** Why a run didn't reach the boards, in the learner's terms; the server's `heldReason` is the key. */
export function heldMessage(reason: string | null): string {
  switch (reason) {
    case "answer_too_fast":
    case "missing_timing":
      return "Some answers came in faster than a person could type them, so this run isn't on the boards.";
    case "claimed_time_exceeds_run":
    case "answers_after_end":
      return "The timing on this run didn't add up, so it isn't on the boards.";
    default:
      return "This run didn't pass a check, so it isn't on the boards.";
  }
}

/** Why a board might be empty, per scope. */
export function emptyBoardText(scope: RaceScope): string {
  switch (scope) {
    case "global":
      return "No runs on this board yet. Be the first.";
    case "country":
      return "No runs from your country yet. Set your country in your profile to join this board.";
    case "weekly":
      return "No runs this week yet. The week starts Monday, UTC.";
    case "friends":
      return "None of your friends have a run here yet. Add friends, then race.";
  }
}

/** A phone or tablet is `touch`; anything with a fine pointer is `keyboard`. The boards are separate per class. */
export function detectDeviceClass(): RaceDeviceClass {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "keyboard";
  return window.matchMedia("(pointer: coarse)").matches ? "touch" : "keyboard";
}
