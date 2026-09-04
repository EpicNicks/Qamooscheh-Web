// Every localStorage access in this app goes through here.
//
// `localStorage` is not merely "maybe empty" — reading the property at all
// THROWS in Safari's private mode with cookies blocked, in some embedded
// webviews, and anywhere the user has disabled site data. That matters more
// than it looks: storage.ts's loadSession() runs inside AuthProvider's lazy
// state initializer, so an unguarded throw there escapes render and white-
// screens the whole app rather than degrading to a signed-out session.
//
// So: try/catch around each operation, falling back to a process-lifetime
// Map. Nothing persists across a reload in that mode (the learner signs in
// again next visit, local prefs reset), but the app runs.

const memory = new Map<string, string>();

let warned = false;

function warnOnce(error: unknown): void {
  if (warned) return;
  warned = true;
  console.warn("localStorage is unavailable; falling back to in-memory storage for this session.", error);
}

export const safeStorage = {
  getItem(key: string): string | null {
    // The fallback wins when it holds the key: it only ever holds values a
    // setItem couldn't persist, which are newer than whatever localStorage
    // still has under that key (the quota-exceeded case, where reads keep
    // working and would otherwise hand back a stale value).
    const fallback = memory.get(key);
    if (fallback !== undefined) return fallback;

    try {
      return localStorage.getItem(key);
    } catch (error) {
      warnOnce(error);
      return null;
    }
  },

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // Also the quota-exceeded path, not just the blocked-access one: either
      // way the value belongs in the fallback rather than silently lost.
      warnOnce(error);
      memory.set(key, value);
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      warnOnce(error);
    }
    memory.delete(key);
  },
};
