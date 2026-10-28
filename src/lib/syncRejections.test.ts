import { beforeAll, describe, expect, it } from "vitest";
import { SYNC_REJECTIONS_CHANGED_EVENT, addRejections, clearRejections, loadRejections } from "./syncRejections";

beforeAll(() => {
  (globalThis as unknown as { window: EventTarget }).window = new EventTarget();
});

const rejection = (submissionId: string) => ({
  submissionId,
  courseCode: "fa",
  unitKey: "u1",
  skillKey: "s1",
  occurredAt: "2026-09-15T10:00:00Z",
  reason: "unknown_skill",
});

describe("syncRejections", () => {
  it("keeps rejections per user and de-duplicates by submission id", () => {
    addRejections("rej-a", [rejection("1"), rejection("2")]);
    addRejections("rej-a", [rejection("2"), rejection("3")]);
    expect(loadRejections("rej-a").map((r) => r.submissionId)).toEqual(["1", "2", "3"]);
    expect(loadRejections("rej-b")).toEqual([]);
  });

  it("clears one user's rejections and announces changes", () => {
    let events = 0;
    window.addEventListener(SYNC_REJECTIONS_CHANGED_EVENT, () => events++);
    addRejections("rej-c", [rejection("1")]);
    addRejections("rej-d", [rejection("1")]);
    clearRejections("rej-c");
    expect(loadRejections("rej-c")).toEqual([]);
    expect(loadRejections("rej-d")).toHaveLength(1);
    expect(events).toBe(3);
  });
});
