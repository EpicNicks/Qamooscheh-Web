import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { safeStorage } from "./safeStorage";

/** Minimal localStorage stand-in whose writes can be made to throw, the way a quota-exceeded or blocked store does. */
function fakeLocalStorage() {
  const store = new Map<string, string>();
  let failWrites = false;
  return {
    failWrites: (value: boolean) => {
      failWrites = value;
    },
    /** Reads/writes the underlying store directly, bypassing safeStorage. */
    raw: store,
    impl: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (failWrites) throw new DOMException("quota exceeded", "QuotaExceededError");
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  };
}

describe("safeStorage", () => {
  let fake: ReturnType<typeof fakeLocalStorage>;

  beforeEach(() => {
    fake = fakeLocalStorage();
    vi.stubGlobal("localStorage", fake.impl);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    // The in-memory fallback is module state; don't leak it between tests.
    safeStorage.removeItem("k");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("falls back to memory when a write fails, and still reads the newest value", () => {
    fake.failWrites(true);
    safeStorage.setItem("k", "v1");

    expect(fake.raw.has("k")).toBe(false);
    expect(safeStorage.getItem("k")).toBe("v1");
  });

  it("drops the stale fallback entry once a write succeeds again", () => {
    fake.failWrites(true);
    safeStorage.setItem("k", "v1");

    fake.failWrites(false);
    safeStorage.setItem("k", "v2");

    expect(fake.raw.get("k")).toBe("v2");
    expect(safeStorage.getItem("k")).toBe("v2");

    // The real proof the fallback is gone: a value written to localStorage by
    // someone else (another tab, say) is now what reads see.
    fake.raw.set("k", "v3");
    expect(safeStorage.getItem("k")).toBe("v3");
  });

  it("removeItem clears both localStorage and the fallback", () => {
    fake.failWrites(true);
    safeStorage.setItem("k", "v1");
    safeStorage.removeItem("k");

    expect(safeStorage.getItem("k")).toBeNull();
  });
});
