// The local-only placeholder "starred vocabulary" store this app shipped
// with before GET/PUT /v1/vocab/starred existed. Read-and-clear only now —
// useStarredLexemes.ts uses this exactly once, to migrate whatever a
// learner already starred locally onto the server the first time this
// loads post-upgrade, via PUT /v1/vocab/starred/batch. Nothing writes here
// any more; the server + react-query cache are the source of truth.
function storageKey(userId: string, courseCode: string): string {
  return `qamooscheh.starredLexemes.${userId}.${courseCode}`;
}

export function loadStarredLexemes(userId: string, courseCode: string): Set<string> {
  const raw = localStorage.getItem(storageKey(userId, courseCode));
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function clearStarredLexemes(userId: string, courseCode: string): void {
  localStorage.removeItem(storageKey(userId, courseCode));
}
