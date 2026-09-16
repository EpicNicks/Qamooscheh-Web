import { beforeAll, describe, expect, it } from "vitest";
import { OFFLINE_QUEUE_CHANGED_EVENT, enqueue, hasUnknownSubmissions, loadQueue, removeFromQueue } from "./offlineQueue";
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
