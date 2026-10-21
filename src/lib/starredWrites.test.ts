import { describe, expect, it } from "vitest";
import { createStarredWriter, overlayPending } from "./starredWrites";
import type { SetStarredRequest, StarredVocabResponse } from "../types/api";

describe("overlayPending", () => {
  it("puts pending stars first and removes pending unstars", () => {
    const pending = new Map([
      ["new", true],
      ["old", false],
    ]);
    expect(overlayPending(["old", "keep"], pending)).toEqual(["new", "keep"]);
  });
});

function harness(failOn: (request: SetStarredRequest, call: number) => boolean = () => false) {
  const server = new Set<string>();
  const sent: SetStarredRequest[] = [];
  const lists: string[][] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const writer = createStarredWriter({
    send: async (request) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      sent.push(request);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight--;
      if (failOn(request, sent.length)) throw new Error("boom");
      if (request.starred) server.add(request.tag);
      else server.delete(request.tag);
      return { tags: [...server], limit: 100, refused: [] } satisfies StarredVocabResponse;
    },
    onList: (tags) => lists.push(tags),
    limitMessageFor: () => null,
  });
  const settle = () => new Promise((resolve) => setTimeout(resolve, 30));
  return { writer, sent, lists, settle, getMaxInFlight: () => maxInFlight };
}

describe("createStarredWriter", () => {
  it("sends one request at a time and ends on the learner's last choice", async () => {
    const h = harness();
    let shown: string[] = [];
    shown = h.writer.set("w", true, shown);
    shown = h.writer.set("w", false, shown);
    shown = h.writer.set("w", true, shown);
    expect(shown).toEqual(["w"]);
    await h.settle();
    expect(h.getMaxInFlight()).toBe(1);
    expect(h.lists.at(-1)).toEqual(["w"]);
  });

  it("does not undo a later choice when an earlier request fails", async () => {
    const h = harness((request, call) => call === 1 && request.tag === "a");
    let shown: string[] = [];
    shown = h.writer.set("a", true, shown);
    shown = h.writer.set("b", true, shown);
    expect(shown.sort()).toEqual(["a", "b"]);
    await h.settle();
    expect(h.lists.at(-1)).toEqual(["b"]);
  });
});
