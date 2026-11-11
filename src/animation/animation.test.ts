import { describe, expect, it } from "vitest";
import { chooseBackend, clampSpeed, settleDelayMs, type RiveBinding } from "./actor";
import { riveWrites } from "./riveBinding";

type S = "a" | "b";
const binding: RiveBinding<S> = {
  src: "x.riv",
  stateMachine: "M",
  stateInput: "state",
  stateIndex: { a: 0, b: 3 },
  speedInput: "speed",
  textRuns: { tag: "tagSymbol" },
};

describe("clampSpeed", () => {
  it("defaults, clamps and rejects non-finite", () => {
    expect(clampSpeed(undefined)).toBe(1);
    expect(clampSpeed(NaN)).toBe(1);
    expect(clampSpeed(0)).toBe(0.25);
    expect(clampSpeed(99)).toBe(4);
    expect(clampSpeed(1.5)).toBe(1.5);
  });
});

describe("chooseBackend", () => {
  it("uses Rive only with art, motion allowed and no failure", () => {
    expect(chooseBackend({ hasRive: true, reducedMotion: false, riveFailed: false })).toBe("rive");
    expect(chooseBackend({ hasRive: false, reducedMotion: false, riveFailed: false })).toBe("fallback");
    expect(chooseBackend({ hasRive: true, reducedMotion: true, riveFailed: false })).toBe("fallback");
    expect(chooseBackend({ hasRive: true, reducedMotion: false, riveFailed: true })).toBe("fallback");
  });
});

describe("settleDelayMs", () => {
  it("is null for loops and scales one-shots by speed", () => {
    expect(settleDelayMs({ loop: true }, 1)).toBeNull();
    expect(settleDelayMs({ loop: false, durationMs: 600 }, 2)).toBe(300);
  });
});

describe("riveWrites", () => {
  it("maps state, speed and slots; drops unmapped slots", () => {
    expect(riveWrites(binding, "b", 2, { tag: "🍎", other: "x" })).toEqual({
      numbers: { state: 3, speed: 2 },
      textRuns: { tagSymbol: "🍎" },
    });
  });

  it("omits speed when the file has no speed input", () => {
    const { speedInput: _unused, ...noSpeed } = binding;
    expect(riveWrites(noSpeed, "a", 2, {}).numbers).toEqual({ state: 0 });
  });

  it("throws on a state with no index", () => {
    expect(() => riveWrites(binding, "zzz" as S, 1, {})).toThrow();
  });
});
