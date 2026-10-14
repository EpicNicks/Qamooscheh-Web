import { describe, expect, it } from "vitest";
import { holdSettled, loadGate, pinFirst } from "./lessonPin";

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

describe("holdSettled", () => {
  const ready = { status: "ready", n: 1 };
  it("waits for a settled state", () => {
    expect(holdSettled(null, { status: "loading", n: 0 })).toBeNull();
    expect(holdSettled(null, { status: "unavailable", n: 0 })).toBeNull();
    expect(holdSettled(null, ready)).toBe(ready);
    expect(holdSettled(null, { status: "none", n: 0 })).toEqual({ status: "none", n: 0 });
  });

  it("keeps the held state through loading or failure, and moves on to a newly settled one", () => {
    expect(holdSettled(ready, { status: "loading", n: 0 })).toBe(ready);
    expect(holdSettled(ready, { status: "unavailable", n: 0 })).toBe(ready);
    expect(holdSettled(ready, { status: "ready", n: 2 })).toEqual({ status: "ready", n: 2 });
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
