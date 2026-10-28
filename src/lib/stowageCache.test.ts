import { QueryClient } from "@tanstack/react-query";
import { beforeAll, describe, expect, it } from "vitest";
import type { BootstrapResponse, StowageUnit, SubmittedSessionResponse } from "../types/api";
import { STOW_EVENT } from "./stowEvents";
import { applyStowCleared, setCachedStowage } from "./stowageCache";

const lesson = (lessonKey: string) => ({ lessonKey, stowedAt: "2026-10-24T12:00:00+00:00", lessonsCompletedSince: 0, readyPromptDue: false, muted: false });
const stowage: StowageUnit[] = [{ unitKey: "u1", lessons: [lesson("a"), lesson("b")] }];

function seeded(): QueryClient {
  const client = new QueryClient();
  const bootstrap: BootstrapResponse = {
    course: null,
    position: { unitKey: "u1", skillKey: "c" },
    graders: [],
    enrolledCourseCodes: [],
    onboardingComplete: true,
    update: null,
    stowage,
    stowableLessonKeys: ["a"],
  };
  client.setQueryData(["bootstrap"], bootstrap);
  return client;
}

const result = (stowCleared: string | null): SubmittedSessionResponse => ({
  submissionId: "s",
  outcome: "Processed",
  rejectionReason: null,
  cards: [],
  stowCleared,
});

// Node environment: the stow events go through `window`, so give it something that takes a listener.
beforeAll(() => {
  (globalThis as unknown as { window: EventTarget }).window = new EventTarget();
});

describe("applyStowCleared", () => {
  it("drops the cleared lesson from the cached Stowage and the stowable list, and announces it", () => {
    const client = seeded();
    const heard: unknown[] = [];
    window.addEventListener(STOW_EVENT, (e) => heard.push((e as CustomEvent).detail), { once: true });
    applyStowCleared(client, [result("a")]);
    const cached = client.getQueryData<BootstrapResponse>(["bootstrap"])!;
    expect(cached.stowage![0].lessons.map((l) => l.lessonKey)).toEqual(["b"]);
    expect(cached.stowableLessonKeys).toEqual([]);
    expect(heard).toEqual([{ name: "stowCleared", lessonKey: "a" }]);
  });

  it("does nothing for a session that cleared nothing", () => {
    const client = seeded();
    const before = client.getQueryData(["bootstrap"]);
    applyStowCleared(client, [result(null), { ...result(null), stowCleared: undefined }]);
    expect(client.getQueryData(["bootstrap"])).toBe(before);
  });

  it("leaves a cold cache alone", () => {
    const client = new QueryClient();
    applyStowCleared(client, [result("a")]);
    expect(client.getQueryData(["bootstrap"])).toBeUndefined();
  });
});

describe("setCachedStowage", () => {
  it("replaces the Stowage and, when given, the cursor", () => {
    const client = seeded();
    setCachedStowage(client, [], { unitKey: "u2", skillKey: "d" });
    const cached = client.getQueryData<BootstrapResponse>(["bootstrap"])!;
    expect(cached.stowage).toEqual([]);
    expect(cached.position).toEqual({ unitKey: "u2", skillKey: "d" });
  });

  it("keeps the cursor when the answer carries none", () => {
    const client = seeded();
    setCachedStowage(client, []);
    expect(client.getQueryData<BootstrapResponse>(["bootstrap"])!.position).toEqual({ unitKey: "u1", skillKey: "c" });
  });
});
