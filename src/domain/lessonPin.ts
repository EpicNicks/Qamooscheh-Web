// A lesson pins what it started with. A deploy can change what the app would
// resolve today (a newer course version in a refetched bootstrap, another
// grader build), but a lesson already on screen keeps the content version and
// the grader it began with until it ends; the next lesson picks up the new ones.

/** The first non-null value seen: `pinned` once there is one, else `live`. */
export function pinFirst<T>(pinned: T | null, live: T | null | undefined): T | null {
  return pinned ?? live ?? null;
}

/**
 * What a lesson's background queries (bootstrap, plan, content) may do to its
 * status: before it has started they decide loading/error, but a refetch that
 * is loading or has failed (a 502 during an API deploy) never replaces a
 * lesson already open.
 */
export function loadGate(started: boolean, loading: boolean, failed: boolean): "loading" | "error" | null {
  if (started) return null;
  return loading ? "loading" : failed ? "error" : null;
}

/**
 * What the grader-gating layout route shows. A lesson that already holds its
 * pinned grader (`held`) stays mounted whatever the provider reports, so a
 * grader language change mid-lesson never replaces it with a spinner and
 * loses its progress; the gate only applies before a lesson has one.
 */
export function graderGate(status: "none" | "loading" | "ready" | "unavailable", held: boolean): "open" | "loading" | "unavailable" {
  if (held || status === "ready" || status === "none") return "open";
  return status;
}
