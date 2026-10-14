import { describe, expect, it } from "vitest";
import { loadGate, pinFirst } from "./lessonPin";

describe("pinFirst", () => {
  it("takes the live value until something is pinned", () => {
    expect(pinFirst(null, undefined)).toBeNull();
    expect(pinFirst(null, { version: 1 })).toEqual({ version: 1 });
  });

  it("keeps the pinned value when the live one changes or goes away", () => {
    const pinned = { version: 1 };
    expect(pinFirst(pinned, { version: 2 })).toBe(pinned);
    expect(pinFirst(pinned, null)).toBe(pinned);
  });
});

describe("loadGate", () => {
  it("decides loading and error before the lesson has started", () => {
    expect(loadGate(false, true, true)).toBe("loading");
    expect(loadGate(false, false, true)).toBe("error");
    expect(loadGate(false, false, false)).toBeNull();
  });

  it("never interrupts a started lesson, whatever its queries do", () => {
    expect(loadGate(true, true, false)).toBeNull();
    expect(loadGate(true, false, true)).toBeNull();
  });
});
