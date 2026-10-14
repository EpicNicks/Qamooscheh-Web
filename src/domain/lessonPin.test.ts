import { describe, expect, it } from "vitest";
import { pinFirst } from "./lessonPin";

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
