import { describe, expect, it, vi } from "vitest";
import workerSource from "../../public/grader-sw.js?raw";

/** Runs public/grader-sw.js against a fake worker scope and returns what it registered. */
function loadWorker() {
  const listeners = new Map<string, (event: unknown) => void>();
  const self = {
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(async () => {}) },
    addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener),
  };
  new Function("self", workerSource)(self);
  return { self, listeners };
}

describe("grader service worker", () => {
  it("never takes over an open lesson when it is updated", () => {
    const { self, listeners } = loadWorker();
    listeners.get("install")?.({});
    expect(self.skipWaiting).not.toHaveBeenCalled();
  });

  it("still claims the page it was first installed for", () => {
    const { self, listeners } = loadWorker();
    const waitUntil = vi.fn();
    listeners.get("activate")?.({ waitUntil });
    expect(self.clients.claim).toHaveBeenCalled();
    expect(waitUntil).toHaveBeenCalled();
  });
});
