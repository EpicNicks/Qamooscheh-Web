import { describe, expect, it } from "vitest";
import { resolveScriptDisplay, segmentAnnotatedText, segmentWords } from "./annotation";
import { ZWNJ } from "./persian/normalize";
import type { WordHint } from "./romanization";

function hint(romanization: string): WordHint {
  return { translation: romanization, romanization, ruby: romanization };
}

describe("resolveScriptDisplay", () => {
  it("maps romanized and both straight through regardless of language", () => {
    expect(resolveScriptDisplay({ scriptMode: "romanized", language: "fa", showFurigana: false })).toBe("romanized");
    expect(resolveScriptDisplay({ scriptMode: "both", language: "fa", showFurigana: false })).toBe("both");
    expect(resolveScriptDisplay({ scriptMode: "both", language: "ja", showFurigana: false })).toBe("both");
  });

  it("keeps native as native for a language with no furigana toggle on", () => {
    expect(resolveScriptDisplay({ scriptMode: "native", language: "fa", showFurigana: false })).toBe("native");
    expect(resolveScriptDisplay({ scriptMode: "native", language: "ja", showFurigana: false })).toBe("native");
  });

  it("Japanese's local showFurigana toggle upgrades native to both", () => {
    expect(resolveScriptDisplay({ scriptMode: "native", language: "ja", showFurigana: true })).toBe("both");
  });

  it("showFurigana has no effect for a language other than Japanese", () => {
    expect(resolveScriptDisplay({ scriptMode: "native", language: "fa", showFurigana: true })).toBe("native");
  });

  it("defaults to native when there's no preference yet (still loading)", () => {
    expect(resolveScriptDisplay({ scriptMode: undefined, language: "fa", showFurigana: false })).toBe("native");
  });
});

describe("segmentWords", () => {
  it("keeps a ZWNJ-joined isolated-letterform spelling inside one word token", () => {
    const isolated = ["می", "شم"].join(ZWNJ); // "می‌شم", isolated-keyboard-mode spelling of "mīsham"
    const pieces = segmentWords(isolated);
    const words = pieces.filter((p) => p.isWord).map((p) => p.text);
    expect(words).toEqual([isolated]);
  });
});

describe("segmentAnnotatedText", () => {
  it("renders a plain word with no hint as an unannotated segment", () => {
    const segments = segmentAnnotatedText("سلام", new Map());
    expect(segments).toEqual([{ text: "سلام", isWord: true, hint: null }]);
  });

  it("passes punctuation/whitespace through unchanged, un-annotated", () => {
    const map = new Map([["سلام", hint("salām")]]);
    const segments = segmentAnnotatedText("سلام،", map);
    expect(segments.map((s) => s.text).join("")).toBe("سلام،");
    expect(segments.find((s) => s.text === "،")?.isWord).toBe(false);
  });

  it("prefers the longest multi-word phrase match over the single-word fallback", () => {
    const map = new Map<string, WordHint>([
      ["آخر", hint("ākhar")],
      ["آخر هفته", hint("ākhar-e hafte")],
    ]);
    const segments = segmentAnnotatedText("آخر هفته خوب است", map);
    // The phrase "آخر هفته" collapses into one segment with the phrase's own hint...
    expect(segments[0]).toEqual({ text: "آخر هفته", isWord: true, hint: hint("ākhar-e hafte") });
    // ...and the rest of the sentence continues normally, word by word.
    expect(segments.slice(1).map((s) => s.text)).toEqual([" ", "خوب", " ", "است"]);
  });

  it("falls back to the single word when no longer phrase matches", () => {
    const map = new Map([["هفته", hint("hafte")]]);
    const segments = segmentAnnotatedText("آخر هفته", map);
    expect(segments[0]).toEqual({ text: "آخر", isWord: true, hint: null });
    expect(segments[2]).toEqual({ text: "هفته", isWord: true, hint: hint("hafte") });
  });
});
