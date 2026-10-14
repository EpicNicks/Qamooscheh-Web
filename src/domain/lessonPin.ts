// A lesson pins what it started with. A deploy can change what the app would
// resolve today (a newer course version in a refetched bootstrap, another
// grader build), but a lesson already on screen keeps the content version and
// the grader it began with until it ends; the next lesson picks up the new ones.

/** The first non-null value seen: `pinned` once there is one, else `live`. */
export function pinFirst<T>(pinned: T | null, live: T | null | undefined): T | null {
  return pinned ?? live ?? null;
}
