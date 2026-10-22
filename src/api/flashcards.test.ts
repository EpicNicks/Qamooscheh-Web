import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock("./httpClient", async (importActual) => ({ ...(await importActual<typeof import("./httpClient")>()), apiFetch }));

import { isFlashcardSubmitInFlight, submitFlashcardsDurably } from "./flashcards";
import { AccountChangedError, ApiError } from "./httpClient";
import { loadFlashcardAttempts } from "../lib/flashcardAttempt";
import type { SubmitFlashcardsRequest } from "../types/api";

const request: SubmitFlashcardsRequest = {
  submissionId: "round-1",
  courseCode: "fa",
  occurredAt: "2026-09-15T10:00:00Z",
  inRemix: false,
  cards: [{ tag: "w1", kind: "translation", correct: true }],
};

describe("submitFlashcardsDurably", () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it("saves before sending, as the account that owns the round", async () => {
    apiFetch.mockImplementation(async () => {
      expect(loadFlashcardAttempts("sub-user-1")).toEqual([request]);
      expect(isFlashcardSubmitInFlight("round-1")).toBe(true);
      return { alreadyProcessed: false, xp: 5 };
    });
    await expect(submitFlashcardsDurably("sub-user-1", request)).resolves.toEqual({ alreadyProcessed: false, xp: 5 });
    expect(apiFetch.mock.calls[0][1]).toMatchObject({ method: "POST", body: request, asUserId: "sub-user-1" });
    expect(loadFlashcardAttempts("sub-user-1")).toEqual([]);
    expect(isFlashcardSubmitInFlight("round-1")).toBe(false);
  });

  it("clears the attempt on any HTTP answer, rejections included", async () => {
    apiFetch.mockRejectedValue(new ApiError(422, null));
    await expect(submitFlashcardsDurably("sub-user-2", request)).rejects.toBeInstanceOf(ApiError);
    expect(loadFlashcardAttempts("sub-user-2")).toEqual([]);
  });

  it("keeps the attempt, unchanged, on a network failure or an account change", async () => {
    apiFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(submitFlashcardsDurably("sub-user-3", request)).rejects.toBeInstanceOf(TypeError);
    expect(loadFlashcardAttempts("sub-user-3")).toEqual([request]);
    apiFetch.mockRejectedValueOnce(new AccountChangedError());
    await expect(submitFlashcardsDurably("sub-user-3", request)).rejects.toBeInstanceOf(AccountChangedError);
    expect(loadFlashcardAttempts("sub-user-3")).toEqual([request]);
    expect(isFlashcardSubmitInFlight("round-1")).toBe(false);
  });
});
