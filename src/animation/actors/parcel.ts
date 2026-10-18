// The path's parcel: one per lesson node. `tag` is the lesson's main-tag
// symbol (domain/mainTag.ts), shown on the parcel's face.
import type { ActorDefinition } from "../actor";
import { ParcelFallback } from "./ParcelFallback";

export type ParcelState = "locked" | "unlocked" | "current" | "done" | "celebrate";
export const parcelActor: ActorDefinition<ParcelState> = {
  id: "parcel",
  states: {
    locked: { loop: true },
    unlocked: { loop: true },
    current: { loop: true },
    done: { loop: true },
    celebrate: { loop: false, durationMs: 700 },
  },
  Fallback: ParcelFallback,
  // No `rive` until the art exists. When it does:
  //   rive: { src: parcelUrl, stateMachine: "Parcel", stateInput: "state", speedInput: "speed",
  //           stateIndex: { locked: 0, unlocked: 1, current: 2, done: 3, celebrate: 4 },
  //           textRuns: { tag: "tagSymbol" } },
};
