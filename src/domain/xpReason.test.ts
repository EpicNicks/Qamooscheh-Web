import { describe, expect, it } from "vitest";
import { explainXp } from "./xpReason";

describe("explainXp", () => {
  it("says nothing for a full first-try award", () => {
    expect(explainXp(10, 10, ["first_try"])).toBeNull();
  });

  it("says nothing for a wrong answer", () => {
    expect(explainXp(0, null, [])).toBeNull();
  });

  it("names why a corrected or retried answer pays less", () => {
    expect(explainXp(7, 7, ["corrected"])).toBe("7 XP for accepted with a correction.");
    expect(explainXp(3, 3, ["retry"])).toBe("3 XP for a retry.");
  });

  it("says a hint halved the award, and from what", () => {
    expect(explainXp(5, 10, ["first_try", "hint_halved"])).toBe("Hint used: half of the 10 XP for a first try.");
  });

  it("uses the grader's lines when it sends them", () => {
    const lines = ["Right first time", "You used a hint, so it's half the XP"];
    expect(explainXp(5, 10, ["first_try", "hint_halved"], lines)).toBe("Right first time. You used a hint, so it's half the XP.");
    expect(explainXp(10, 10, ["first_try"], ["Right first time"])).toBeNull();
    expect(explainXp(3, 3, ["retry"], ["Right on a retry"])).toBe("Right on a retry.");
  });

  it("falls back on a code it does not know", () => {
    expect(explainXp(4, 4, ["something_new"])).toBe("4 XP for an earlier slip.");
  });
});
