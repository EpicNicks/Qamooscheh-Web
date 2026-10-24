import { describe, expect, it } from "vitest";
import type { StowageUnit } from "../types/api";
import { hasReadyPrompt, stowedRefs, stowRefusalMessage, withoutStowedLesson } from "./stowage";

function lesson(lessonKey: string, extra: Partial<StowageUnit["lessons"][number]> = {}) {
  return { lessonKey, stowedAt: "2026-10-24T12:00:00+00:00", lessonsCompletedSince: 0, readyPromptDue: false, muted: false, ...extra };
}

const stowage: StowageUnit[] = [
  { unitKey: "02-daily-life", lessons: [lesson("01-family", { readyPromptDue: true })] },
  { unitKey: "01-greetings", lessons: [lesson("01-hello"), lesson("03-bye")] },
];

describe("stowedRefs", () => {
  it("joins unit and lesson, and treats a missing Stowage as empty", () => {
    expect([...stowedRefs(stowage)].sort()).toEqual(["01-greetings/01-hello", "01-greetings/03-bye", "02-daily-life/01-family"]);
    expect(stowedRefs(undefined).size).toBe(0);
  });
});

describe("hasReadyPrompt", () => {
  it("is true when any lesson is due", () => {
    expect(hasReadyPrompt(stowage)).toBe(true);
  });

  it("is false when none is due, when empty, and when absent", () => {
    expect(hasReadyPrompt([{ unitKey: "u", lessons: [lesson("a", { muted: true })] }])).toBe(false);
    expect(hasReadyPrompt([])).toBe(false);
    expect(hasReadyPrompt(undefined)).toBe(false);
  });
});

describe("withoutStowedLesson", () => {
  it("removes the lesson and keeps the server's order", () => {
    expect(withoutStowedLesson(stowage, "03-bye").map((u) => [u.unitKey, u.lessons.map((l) => l.lessonKey)])).toEqual([
      ["02-daily-life", ["01-family"]],
      ["01-greetings", ["01-hello"]],
    ]);
  });

  it("drops a unit left empty", () => {
    expect(withoutStowedLesson(stowage, "01-family").map((u) => u.unitKey)).toEqual(["01-greetings"]);
  });

  it("changes nothing for a lesson that isn't stowed", () => {
    expect(withoutStowedLesson(stowage, "nope")).toEqual(stowage);
  });
});

describe("stowRefusalMessage", () => {
  it("explains the 409 and 404 reasons and falls back for anything else", () => {
    for (const reason of ["no_failed_attempt", "already_cleared", "already_dropped", "not_current_position", "unknown_lesson"]) {
      expect(stowRefusalMessage(reason)).not.toBe(stowRefusalMessage(undefined));
    }
    expect(stowRefusalMessage("invalid_request")).toBe(stowRefusalMessage(null));
  });
});
