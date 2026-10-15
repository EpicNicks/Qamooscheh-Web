import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/httpClient";
import type { UsernameAvailability } from "../api/username";
import { availabilityCopy, renameErrorCopy } from "./username";
import { createAvailabilityChecker, type AvailabilityState } from "./usernameAvailability";

type Deferred = {
  signal: AbortSignal;
  name: string;
  resolve: (r: UsernameAvailability) => void;
  reject: (e: unknown) => void;
};

function setup(skip?: (n: string) => boolean) {
  const calls: Deferred[] = [];
  const states: AvailabilityState[] = [];
  const checker = createAvailabilityChecker({
    check: (name, signal) =>
      new Promise((resolve, reject) => {
        calls.push({ signal, name, resolve, reject });
      }),
    onChange: (s) => states.push(s),
    skip,
  });
  return { calls, states, checker, last: () => states[states.length - 1] };
}

const free = (username: string): UsernameAvailability => ({
  username,
  available: true,
  reason: null,
});

describe("createAvailabilityChecker", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("checks format instantly and makes no request for invalid input", () => {
    const { calls, last, checker } = setup();
    checker.update("ab");
    expect(last().kind).toBe("invalid");
    vi.advanceTimersByTime(1000);
    expect(calls).toHaveLength(0);
  });

  it("debounces: one request ~400ms after typing stops, with the normalized value", () => {
    const { calls, last, checker } = setup();
    checker.update("sar");
    vi.advanceTimersByTime(300);
    checker.update("@Sara");
    vi.advanceTimersByTime(399);
    expect(calls).toHaveLength(0);
    expect(last().kind).toBe("checking");
    vi.advanceTimersByTime(1);
    expect(calls.map((c) => c.name)).toEqual(["sara"]);
  });

  it("reports available and unavailable reasons", async () => {
    const { calls, last, checker } = setup();
    checker.update("sara");
    vi.advanceTimersByTime(400);
    calls[0].resolve(free("sara"));
    await Promise.resolve();
    expect(last().kind).toBe("available");

    checker.update("sarah");
    vi.advanceTimersByTime(400);
    calls[1].resolve({ username: "sarah", available: false, reason: "taken" });
    await Promise.resolve();
    expect(last()).toEqual({
      kind: "unavailable",
      message: availabilityCopy(null, "taken"),
    });
  });

  it("aborts the in-flight request when the input changes and ignores its late response", async () => {
    const { calls, last, checker } = setup();
    checker.update("sara");
    vi.advanceTimersByTime(400);
    checker.update("sarah");
    expect(calls[0].signal.aborted).toBe(true);
    vi.advanceTimersByTime(400);
    calls[1].resolve(free("sarah"));
    await Promise.resolve();
    expect(last().kind).toBe("available");
    // The stale response arrives after the newer one and must not overwrite it.
    calls[0].resolve({ username: "sara", available: false, reason: "taken" });
    await Promise.resolve();
    expect(last().kind).toBe("available");
  });

  it("goes idle and cancels when the input is cleared or invalid mid-flight", async () => {
    const { calls, last, checker } = setup();
    checker.update("sara");
    vi.advanceTimersByTime(400);
    checker.update("");
    expect(calls[0].signal.aborted).toBe(true);
    expect(last().kind).toBe("idle");
    calls[0].resolve(free("sara"));
    await Promise.resolve();
    expect(last().kind).toBe("idle");
  });

  it("maps 429 to friendly copy", async () => {
    const { calls, last, checker } = setup();
    checker.update("sara");
    vi.advanceTimersByTime(400);
    calls[0].reject(new ApiError(429, null));
    await Promise.resolve();
    expect(last()).toEqual({
      kind: "error",
      message: availabilityCopy(429, null),
    });
    expect(availabilityCopy(429, null)).toMatch(/too fast/);
  });

  it("skips the check for the current handle", () => {
    const { calls, last, checker } = setup((n) => n === "me_now");
    checker.update("Me_Now");
    vi.advanceTimersByTime(1000);
    expect(calls).toHaveLength(0);
    expect(last().kind).toBe("idle");
  });

  it("dispose cancels pending work and silences later results", async () => {
    const { calls, states, checker } = setup();
    checker.update("sara");
    vi.advanceTimersByTime(400);
    checker.dispose();
    const before = states.length;
    calls[0].resolve(free("sara"));
    await Promise.resolve();
    expect(calls[0].signal.aborted).toBe(true);
    expect(states).toHaveLength(before);
  });
});

describe("submit rejection copy", () => {
  it("maps the PUT rejections shown on the onboarding step", () => {
    expect(renameErrorCopy(409, "taken")).toMatch(/already has/);
    expect(renameErrorCopy(409, "held")).toMatch(/held/);
    expect(renameErrorCopy(400, "reserved")).toMatch(/isn't allowed/);
    expect(renameErrorCopy(400, "invalid")).toMatch(/valid username/);
    expect(renameErrorCopy(429, undefined)).toMatch(/Too many/);
  });
});
