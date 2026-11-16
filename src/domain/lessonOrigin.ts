import type { SkillCategory } from "./enums";

/**
 * Where a lesson was launched from, carried on the lesson/practice/story URL as
 * `?from=<in-app path>` so finishing or leaving it returns the learner there.
 *
 * The value is an in-app path, never a URL: it is matched against an
 * allow-list (so `?from=https://evil.example` or `//evil.example` is ignored,
 * not an open redirect) and anything unrecognised falls back to the Journey.
 * Absent means "/path", which is also what every launch point that isn't
 * listed here (road nodes, repack, themes' deep dives) keeps doing.
 *
 * Allowed: `/path`, `/themes`, `/library/<category>`.
 */
export interface LessonOrigin {
  /** The in-app path to return to. */
  to: string;
  /** Button copy, e.g. "Back to listening". */
  label: string;
}

export const DEFAULT_LESSON_ORIGIN: LessonOrigin = { to: "/path", label: "Back to path" };

const LIBRARY_LABELS: Record<SkillCategory, string | null> = {
  standard: null,
  story: "Back to stories",
  conversation: "Back to conversations",
  song: "Back to songs",
  listening: "Back to listening",
};

/** The Library page for a category, used as the `from` value by its rows. */
export function libraryOrigin(category: SkillCategory): string {
  return `/library/${category}`;
}

/** Resolves a raw `from` value to a safe origin, or the default when it is absent or not allow-listed. */
export function resolveLessonOrigin(raw: string | null | undefined): LessonOrigin {
  if (!raw) return DEFAULT_LESSON_ORIGIN;
  if (raw === "/path") return DEFAULT_LESSON_ORIGIN;
  if (raw === "/themes") return { to: "/themes", label: "Back to themes" };
  const match = /^\/library\/([a-z]+)$/.exec(raw);
  if (match) {
    const label = Object.prototype.hasOwnProperty.call(LIBRARY_LABELS, match[1]) ? LIBRARY_LABELS[match[1] as SkillCategory] : null;
    if (label) return { to: raw, label };
  }
  return DEFAULT_LESSON_ORIGIN;
}

/** Appends `from` to a route that may already carry a query (e.g. `?first=1`). A missing or default origin leaves the route untouched. */
export function withLessonOrigin(route: string, from: string | null | undefined): string {
  if (!from || resolveLessonOrigin(from) === DEFAULT_LESSON_ORIGIN) return route;
  return `${route}${route.includes("?") ? "&" : "?"}from=${encodeURIComponent(from)}`;
}
