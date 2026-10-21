import { beforeAll, describe, expect, it } from "vitest";
import {
  CLAIM_TTL_MS,
  OFFLINE_QUEUE_CHANGED_EVENT,
  enqueue,
  enqueueClaimed,
  flushable,
  hasUnknownSubmissions,
  isClaimLive,
  loadQueue,
  releaseClaims,
  removeFromQueue,
  settleFlush,
} from "./offlineQueue";
import { safeStorage } from "./safeStorage";
import type { SubmittedSession } from "../types/api";

// The suite runs in the node environment: `localStorage` is absent, which
// safeStorage already degrades to its in-memory map for, but the queue also
// dispatches a same-tab change event — so `window` needs to be something that
// can take a listener. A bare EventTarget is exactly enough.
beforeAll(() => {
  (globalThis as unknown as { window: EventTarget }).window = new EventTarget();
});

function session(submissionId: string, courseCode = "fa", courseVersion = 3): SubmittedSession {
  return {
    submissionId,
    unitKey: "u1",
    skillKey: "s1",
    courseCode,
    courseVersion,
    occurredAt: "2026-09-15T10:00:00Z",
    completed: true,
    items: [],
  };
}

describe("offlineQueue", () => {
  it("round-trips a queued session, courseCode included", () => {
    const userId = "user-course-code";
    enqueue(userId, session("a", "fa"));
    enqueue(userId, session("b", "ja"));

    expect(loadQueue(userId).map((s) => [s.courseCode, s.submissionId])).toEqual([
      ["fa", "a"],
      ["ja", "b"],
    ]);
  });

  it("drops entries that aren't session-shaped (corrupted or foreign JSON)", () => {
    const userId = "user-corrupt";
    safeStorage.setItem(`qamooscheh.offlineQueue.${userId}`, JSON.stringify([session("ok"), { garbage: true }, null, "x"]));

    const queue = loadQueue(userId);
    expect(queue.map((s) => s.submissionId)).toEqual(["ok"]);
  });

  it("returns an empty queue for non-array JSON", () => {
    const userId = "user-non-array";
    safeStorage.setItem(`qamooscheh.offlineQueue.${userId}`, JSON.stringify({ not: "an array" }));

    expect(loadQueue(userId)).toEqual([]);
  });

  it("removes only the settled submissions", () => {
    const userId = "user-remove";
    enqueue(userId, session("keep"));
    enqueue(userId, session("drop"));

    removeFromQueue(userId, ["drop"]);

    expect(loadQueue(userId).map((s) => s.submissionId)).toEqual(["keep"]);
  });

  it("notifies listeners on enqueue and removal", () => {
    const userId = "user-events";
    let fired = 0;
    const listener = () => {
      fired += 1;
    };
    window.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, listener);

    enqueue(userId, session("x"));
    removeFromQueue(userId, ["x"]);

    window.removeEventListener(OFFLINE_QUEUE_CHANGED_EVENT, listener);
    expect(fired).toBe(2);
  });
});

describe("hasUnknownSubmissions", () => {
  // The drain check: queue-changed events raised during a flush are dropped by
  // the guard flag, so a session enqueued mid-flush is detected by comparing
  // what's left against the ids that pass started with.
  it("is true for a session enqueued during the flush", () => {
    const knownIds = new Set(["fa-1"]);
    const remaining = [session("fa-2")];
    expect(hasUnknownSubmissions(remaining, knownIds)).toBe(true);
  });

  it("is false for entries the pass already knew about (its own removals)", () => {
    const knownIds = new Set(["fa-1", "ja-1"]);
    const remaining = [session("ja-1", "ja")];
    expect(hasUnknownSubmissions(remaining, knownIds)).toBe(false);
  });
});

describe("settleFlush", () => {
  const card = { lexemeTag: "w", stability: 1, difficulty: 1, lastReviewedAt: null, dueAt: null, reviewCount: 1, lapseCount: 0 };
  const reply = (submissionId: string, outcome: "Processed" | "AlreadyProcessed" | "Rejected", reason: string | null = null) => ({
    submissionId,
    outcome,
    rejectionReason: reason,
    cards: [card],
  });

  it("keeps rejected sessions with their reason and merges cards only from the others", () => {
    const result = settleFlush([session("a"), session("b"), session("c")], {
      sessions: [reply("a", "Processed"), reply("b", "Rejected", "unresolvable_course_version")],
    });
    expect(result.settledIds).toEqual(["a", "b"]);
    expect(result.rejections).toEqual([
      {
        submissionId: "b",
        courseCode: "fa",
        unitKey: "u1",
        skillKey: "s1",
        occurredAt: "2026-09-15T10:00:00Z",
        reason: "unresolvable_course_version",
      },
    ]);
    expect(result.cards).toHaveLength(1);
  });
});

describe("write-ahead claims", () => {
  const now = 1_000_000;

  it("treats a recent claim by this page as live", () => {
    expect(isClaimLive({ ...session("a"), claimedBy: "p1", claimedAt: now - 1000 }, "p1", now)).toBe(true);
  });

  it("is not live when stale, unclaimed, or claimed by another page", () => {
    expect(isClaimLive({ ...session("a"), claimedBy: "p1", claimedAt: now - CLAIM_TTL_MS }, "p1", now)).toBe(false);
    expect(isClaimLive(session("a"), "p1", now)).toBe(false);
    expect(isClaimLive({ ...session("a"), claimedBy: "p2", claimedAt: now }, "p1", now)).toBe(false);
  });

  it("flushable drops only entries live-claimed by this page", () => {
    const queue = [
      session("live-mine"),
      session("stale-mine"),
      session("theirs"),
      session("plain"),
    ].map((entry, i) => {
      if (i === 0) return { ...entry, claimedBy: "p1", claimedAt: now };
      if (i === 1) return { ...entry, claimedBy: "p1", claimedAt: now - CLAIM_TTL_MS - 1 };
      if (i === 2) return { ...entry, claimedBy: "p2", claimedAt: now };
      return entry;
    });
    expect(flushable(queue, "p1", now).map((e) => e.submissionId)).toEqual(["stale-mine", "theirs", "plain"]);
  });

  it("enqueueClaimed persists the claim and removeFromQueue clears it", () => {
    const userId = "user-claimed";
    enqueueClaimed(userId, session("w"), "p1");
    const [entry] = loadQueue(userId);
    expect(entry.claimedBy).toBe("p1");
    expect(typeof entry.claimedAt).toBe("number");

    removeFromQueue(userId, ["w"]);
    expect(loadQueue(userId)).toEqual([]);
  });

  it("releaseClaims keeps the entry but drops the claim", () => {
    const userId = "user-release";
    enqueueClaimed(userId, session("r"), "p1");
    releaseClaims(userId, ["r"]);
    const [entry] = loadQueue(userId);
    expect(entry.submissionId).toBe("r");
    expect(entry.claimedBy).toBeUndefined();
    expect(entry.claimedAt).toBeUndefined();
  });
});
