import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHoverCloser, HINT_CLOSE_DELAY_MS } from "./hintHover";

describe("createHoverCloser", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function setup() {
    const states: boolean[] = [];
    return { states, closer: createHoverCloser((hovered) => states.push(hovered)) };
  }

  it("opens at once on enter", () => {
    const { states, closer } = setup();
    closer.enter();
    expect(states).toEqual([true]);
  });

  it("closes only after the delay once the pointer leaves", () => {
    const { states, closer } = setup();
    closer.enter();
    closer.leave();
    vi.advanceTimersByTime(HINT_CLOSE_DELAY_MS - 1);
    expect(states).toEqual([true]);
    vi.advanceTimersByTime(1);
    expect(states).toEqual([true, false]);
  });

  it("stays open when the pointer crosses to the hint within the delay", () => {
    const { states, closer } = setup();
    closer.enter();
    closer.leave();
    vi.advanceTimersByTime(HINT_CLOSE_DELAY_MS / 2);
    closer.enter();
    vi.advanceTimersByTime(HINT_CLOSE_DELAY_MS * 2);
    expect(states).toEqual([true, true]);
  });

  it("restarts the delay on a second leave", () => {
    const { states, closer } = setup();
    closer.enter();
    closer.leave();
    vi.advanceTimersByTime(HINT_CLOSE_DELAY_MS - 10);
    closer.leave();
    vi.advanceTimersByTime(HINT_CLOSE_DELAY_MS - 10);
    expect(states).toEqual([true]);
    vi.advanceTimersByTime(10);
    expect(states).toEqual([true, false]);
  });

  it("close() ends it now and drops a pending close", () => {
    const { states, closer } = setup();
    closer.enter();
    closer.leave();
    closer.close();
    vi.advanceTimersByTime(HINT_CLOSE_DELAY_MS * 2);
    expect(states).toEqual([true, false]);
  });
});
