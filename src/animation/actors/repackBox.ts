// The big Repack package: a parcel drops in, the lid closes and reopens.
// A looping `idle` plus one-shot transitions the page chains with onSettled.
import type { ActorDefinition } from "../actor";
import { RepackBoxFallback } from "./RepackBoxFallback";

export type RepackBoxState = "open" | "receive" | "closing" | "closed" | "opening";
export const repackBoxActor: ActorDefinition<RepackBoxState> = {
  id: "repack-box",
  states: {
    open: { loop: true },
    receive: { loop: false, durationMs: 600 },
    closing: { loop: false, durationMs: 500 },
    closed: { loop: true },
    opening: { loop: false, durationMs: 500 },
  },
  Fallback: RepackBoxFallback,
};
