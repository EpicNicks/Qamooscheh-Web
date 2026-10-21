import { describe, expect, it } from "vitest";
import {
  clearFlashcardAttempt,
  clearFlashcardAttempts,
  isFlashcardAttempt,
  loadFlashcardAttempts,
  saveFlashcardAttempt,
} from "./flashcardAttempt";
import { safeStorage } from "./safeStorage";
import type { SubmitFlashcardsRequest } from "../types/api";

function request(submissionId: string, occurredAt = "2026-09-15T10:00:00Z"): SubmitFlashcardsRequest {
  return {
    submissionId,
    courseCode: "fa",
    occurredAt,
    inRemix: false,
    cards: [{ tag: "w1", kind: "translation", correct: true }],
  };
}

describe("flashcardAttempt", () => {
  it("round-trips the full request body, id and occurredAt included", () => {
    saveFlashcardAttempt("fc-user-1", { ...request("a"), hardcore: true });
    expect(loadFlashcardAttempts("fc-user-1")).toEqual([{ ...request("a"), hardcore: true }]);
  });

  it("returns nothing when nothing is saved", () => {
    expect(loadFlashcardAttempts("fc-user-none")).toEqual([]);
  });

  it("keeps users apart", () => {
    saveFlashcardAttempt("fc-user-2", request("a"));
    expect(loadFlashcardAttempts("fc-user-3")).toEqual([]);
  });

  it("overwrites the same id and keeps different rounds apart, oldest first", () => {
    saveFlashcardAttempt("fc-user-4", request("late", "2026-09-15T12:00:00Z"));
    saveFlashcardAttempt("fc-user-4", request("early", "2026-09-15T09:00:00Z"));
    saveFlashcardAttempt("fc-user-4", { ...request("early", "2026-09-15T09:00:00Z"), inRemix: true });
    expect(loadFlashcardAttempts("fc-user-4").map((a) => [a.submissionId, a.inRemix])).toEqual([
      ["early", true],
      ["late", false],
    ]);
  });

  it("clears only the named round, and removes the key once empty", () => {
    saveFlashcardAttempt("fc-user-5", request("a"));
    saveFlashcardAttempt("fc-user-5", request("b"));
    clearFlashcardAttempt("fc-user-5", "a");
    expect(loadFlashcardAttempts("fc-user-5").map((a) => a.submissionId)).toEqual(["b"]);
    clearFlashcardAttempt("fc-user-5", "b");
    expect(safeStorage.getItem("qamooscheh.flashcardAttempts.fc-user-5")).toBeNull();
  });

  it("drops everything for a user at sign-out", () => {
    saveFlashcardAttempt("fc-user-6", request("a"));
    clearFlashcardAttempts("fc-user-6");
    expect(loadFlashcardAttempts("fc-user-6")).toEqual([]);
  });

  it("ignores corrupt storage and malformed entries", () => {
    safeStorage.setItem("qamooscheh.flashcardAttempts.fc-user-7", "{not json");
    expect(loadFlashcardAttempts("fc-user-7")).toEqual([]);
    safeStorage.setItem("qamooscheh.flashcardAttempts.fc-user-8", JSON.stringify({ a: { submissionId: "a" }, b: request("b") }));
    expect(loadFlashcardAttempts("fc-user-8").map((a) => a.submissionId)).toEqual(["b"]);
    safeStorage.setItem("qamooscheh.flashcardAttempts.fc-user-9", JSON.stringify([request("a")]));
    expect(loadFlashcardAttempts("fc-user-9")).toEqual([]);
  });

  it("recognises a well-formed attempt only", () => {
    expect(isFlashcardAttempt(request("a"))).toBe(true);
    expect(isFlashcardAttempt({ ...request("a"), cards: "x" })).toBe(false);
    expect(isFlashcardAttempt(null)).toBe(false);
  });
});
