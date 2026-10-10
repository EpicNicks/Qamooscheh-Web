import { describe, expect, it } from "vitest";
import { reportContextFor, reportReasonsFor, type ReportableItem } from "./exerciseReport";

const item: ReportableItem = {
  exercise: { prompt: "How are you?", tags: ["خوب<adj>"] },
  renderType: "type_in",
  unitKey: "01-greetings",
  skillKey: "02-how-are-you",
  ordinal: 4,
};

describe("reportContextFor", () => {
  it("cites the full location, the graded text and each played take once", () => {
    const context = reportContextFor(item, " khubam ", 3, ["../../../audio/a.mp3", null, "../../../audio/a.mp3"]);

    expect(context).toEqual({
      prompt: "How are you?",
      exerciseTags: ["خوب<adj>"],
      submittedText: " khubam ",
      renderType: "type_in",
      location: { courseVersion: 3, unitKey: "01-greetings", skillKey: "02-how-are-you", exerciseOrdinal: 4 },
      audioFiles: ["../../../audio/a.mp3"],
    });
  });

  it("leaves out the submitted text before an answer", () => {
    const context = reportContextFor(item, null, 3, ["../../../audio/a.mp3"]);

    expect(context).not.toHaveProperty("submittedText");
    expect(context.audioFiles).toEqual(["../../../audio/a.mp3"]);
  });

  it("keeps a theme lesson's null unit", () => {
    const context = reportContextFor({ ...item, unitKey: null }, "x", 3, []);

    expect(context.location).toEqual({ courseVersion: 3, unitKey: null, skillKey: "02-how-are-you", exerciseOrdinal: 4 });
  });

  it("sends no location rather than half of one", () => {
    expect(reportContextFor(item, "x", null, []).location).toBeNull();
    expect(reportContextFor({ ...item, skillKey: undefined }, "x", 3, []).location).toBeNull();
    expect(reportContextFor({ ...item, ordinal: undefined }, "x", 3, []).location).toBeNull();
  });

  it("treats ordinal 0 as a real ordinal", () => {
    expect(reportContextFor({ ...item, ordinal: 0 }, "x", 3, []).location?.exerciseOrdinal).toBe(0);
  });
});

describe("reportReasonsFor", () => {
  const values = (stage: Parameters<typeof reportReasonsFor>[0]) => reportReasonsFor(stage).map((r) => r.value);

  it("offers every reason after a wrong answer", () => {
    expect(values("incorrect")).toEqual(["audio_wrong", "answer_should_be_accepted", "other"]);
  });

  it("offers only audio and other before answering and after a correct answer", () => {
    expect(values("unanswered")).toEqual(["audio_wrong", "other"]);
    expect(values("correct")).toEqual(["audio_wrong", "other"]);
  });
});
