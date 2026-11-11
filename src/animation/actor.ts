// The animation layer's contract. Pages and nodes talk to an <Actor> in terms
// of a named `state`, a playback `speed` and text `slots`; they never know
// whether Rive, plain CSS/SVG or anything else is drawing it. A backend is
// swappable per actor definition, and every actor MUST ship a Fallback, so a
// missing .riv, a failed chunk, or prefers-reduced-motion degrades to a
// working (if plainer) picture rather than to nothing.
import type { ComponentType } from "react";

export interface StateSpec {
  /** Looping states hold until `state` changes; one-shot states play once, then fire `onSettled`. */
  loop: boolean;
  /** One-shot length at speed 1, for the fallback's timer. Required when `loop` is false. */
  durationMs?: number;
}

/** What every backend (Rive, Fallback) receives. */
export interface ActorRenderProps<S extends string> {
  state: S;
  /** 1 = authored speed. Already clamped by <Actor>. */
  speed: number;
  /** Dynamic details, by slot name (e.g. `tag`: the lesson's main-tag symbol). */
  slots: Readonly<Record<string, string>>;
  /** True under prefers-reduced-motion: draw the state's resting pose, no movement. */
  still: boolean;
}

/**
 * How a Rive file is driven. This is the contract the artist builds to:
 * one state machine with a number input for the state (indexed by
 * `stateIndex`), an optional number input for speed, one text run per slot,
 * and a Rive event named `settled` fired when a one-shot finishes.
 */
export interface RiveBinding<S extends string> {
  /** URL of the .riv (import it with `?url` so Vite fingerprints it). */
  src: string;
  artboard?: string;
  stateMachine: string;
  /** Name of the number input that selects the state. */
  stateInput: string;
  stateIndex: Readonly<Record<S, number>>;
  /** Number input scaling playback; omit if the file has none (speed is then ignored in Rive). */
  speedInput?: string;
  /** Slot name -> the Rive text run it writes. */
  textRuns?: Readonly<Record<string, string>>;
}

export interface ActorDefinition<S extends string> {
  id: string;
  states: Readonly<Record<S, StateSpec>>;
  Fallback: ComponentType<ActorRenderProps<S>>;
  /** Absent until the art exists: the actor then simply uses its Fallback. */
  rive?: RiveBinding<S>;
}

export interface ActorProps<S extends string> {
  state: S;
  speed?: number;
  slots?: Readonly<Record<string, string>>;
  /** Fired once each time a one-shot state finishes (or immediately under reduced motion). */
  onSettled?: (state: S) => void;
  className?: string;
  /** Accessible name. Omit for a purely decorative actor. */
  label?: string;
}

export const MIN_SPEED = 0.25;
export const MAX_SPEED = 4;

/** Keeps a caller's speed in a range both backends handle, and finite. */
export function clampSpeed(speed: number | undefined): number {
  if (speed == null || !Number.isFinite(speed)) return 1;
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed));
}

export type BackendKind = "rive" | "fallback";

/** Which backend should draw: Rive only when there is art, motion is allowed, and it hasn't failed. */
export function chooseBackend(opts: { hasRive: boolean; reducedMotion: boolean; riveFailed: boolean }): BackendKind {
  return opts.hasRive && !opts.reducedMotion && !opts.riveFailed ? "rive" : "fallback";
}

/** How long the fallback should wait before a one-shot state counts as settled; null for a looping state. */
export function settleDelayMs(spec: StateSpec, speed: number): number | null {
  if (spec.loop) return null;
  return Math.round((spec.durationMs ?? 0) / speed);
}
