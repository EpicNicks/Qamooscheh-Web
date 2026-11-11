// The pure half of the Rive adapter: turns Actor props into the writes a Rive
// state machine understands, so the mapping is testable without a canvas.
import type { RiveBinding } from "./actor";

export interface RiveWrites {
  numbers: Record<string, number>;
  textRuns: Record<string, string>;
}

/**
 * Slots with no text run in the binding are dropped (the art doesn't show
 * that detail); unknown states throw, because that is a programming error in
 * the definition rather than something to paper over at runtime.
 */
export function riveWrites<S extends string>(
  binding: RiveBinding<S>,
  state: S,
  speed: number,
  slots: Readonly<Record<string, string>>,
): RiveWrites {
  const index = binding.stateIndex[state];
  if (index === undefined) throw new Error(`No Rive state index for "${state}"`);

  const numbers: Record<string, number> = { [binding.stateInput]: index };
  if (binding.speedInput) numbers[binding.speedInput] = speed;

  const textRuns: Record<string, string> = {};
  for (const [slot, value] of Object.entries(slots)) {
    const run = binding.textRuns?.[slot];
    if (run) textRuns[run] = value;
  }
  return { numbers, textRuns };
}
