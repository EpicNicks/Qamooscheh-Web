import { describe, expect, it } from "vitest";
import { retryWeight, verdictWeight } from "./lessonScore";

describe("lesson score", () => {
  it("weights a first attempt by its verdict", () => {
    expect(verdictWeight("correct")).toBe(1);
    expect(verdictWeight("accepted_with_correction")).toBe(0.5);
    expect(verdictWeight("incorrect")).toBe(0);
    expect(retryWeight("correct", 1)).toBe(1);
  });

  it("halves a right answer for each attempt before it", () => {
    expect(retryWeight("correct", 2)).toBe(0.5);
    expect(retryWeight("correct", 3)).toBe(0.25);
    expect(retryWeight("accepted_with_correction", 2)).toBe(0.25);
    expect(retryWeight("incorrect", 2)).toBe(0);
  });

  it("gives nothing for an attempt below 1", () => {
    expect(retryWeight("correct", 0)).toBe(0);
  });

  it("matches the backend's worked example: 13 first try, 2 on the second, 1 on the third, of 16", () => {
    const points = 13 * retryWeight("correct", 1) + 2 * retryWeight("correct", 2) + retryWeight("correct", 3);
    expect(points / 16).toBe(14.25 / 16);
  });
});
