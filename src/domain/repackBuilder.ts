// Repack builder (the former Remix builder): the learner searches single
// Parsles, drops them into a box, and GO! starts the existing lesson-less
// remix route with exactly those Parsles. Everything here is pure so the
// search, box rules and URL are testable without a DOM; the sequencing of
// animations lives in repackSequence.ts.
import type { SkillArtifact, ThemeIndexArtifact, ThemeLessonRef } from "../types/content";
import { refKey } from "./skillRefKey";

/** Most results the autocomplete dropdown shows at once. */
export const MAX_RESULTS = 8;

export interface RepackCandidate {
  /** The lesson key (what the remix route and the engine take). */
  id: string;
  title: string;
  /** From the lesson's artifact path (units/{unitKey}/skills/…); null for a standalone lesson. */
  unitKey: string | null;
  /** The lesson's authored tags. */
  themes: string[];
  arc: string | null;
}

/** `units/{unitKey}/skills/{skillKey}.json` gives the unit; `lessons/{key}.json` (standalone) has none. */
export function unitKeyFromPath(path: string): string | null {
  const match = /(?:^|\/)units\/([^/]+)\//.exec(path);
  return match ? match[1] : null;
}

/**
 * Every standard-category lesson in the theme index, deduped by id, sorted by
 * title. Story/conversation/song lessons are left out for the same reason the
 * remix pool leaves them out (deepDiveRemix.ts), and a lesson whose artifact
 * hasn't loaded yet can't be titled or categorised so it is skipped too.
 */
export function buildCandidates(
  themeIndex: ThemeIndexArtifact | null | undefined,
  skillArtifacts: Map<string, SkillArtifact>,
): RepackCandidate[] {
  const seen = new Set<string>();
  const out: RepackCandidate[] = [];
  for (const theme of themeIndex?.themes ?? []) {
    for (const lesson of theme.lessons) {
      if (seen.has(lesson.id)) continue;
      seen.add(lesson.id);
      const artifact = skillArtifacts.get(refKey({ unitKey: null, skillKey: lesson.id }));
      if (artifact?.category !== "standard") continue;
      out.push({
        id: lesson.id,
        title: artifact.title,
        unitKey: unitKeyFromPath(lesson.path),
        themes: artifact.themes ?? [],
        arc: artifact.arc,
      });
    }
  }
  return out.sort((a, b) => a.title.localeCompare(b.title));
}

/** The text a query is matched against: title, lesson key, unit, tags and arc. */
function haystack(candidate: RepackCandidate): string {
  return [candidate.title, candidate.id, candidate.unitKey ?? "", candidate.themes.join(" "), candidate.arc ?? ""]
    .join(" ")
    .toLowerCase();
}

/**
 * Candidates matching every whitespace-separated word of `query` (substring,
 * case-insensitive), minus those already in the box. Title matches rank first.
 * An empty query returns nothing: the dropdown only opens once the learner types.
 */
export function searchCandidates(
  candidates: readonly RepackCandidate[],
  query: string,
  excludeIds: readonly string[],
  limit: number = MAX_RESULTS,
): RepackCandidate[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const excluded = new Set(excludeIds);
  const matches = candidates.filter((c) => {
    if (excluded.has(c.id)) return false;
    const text = haystack(c);
    return words.every((w) => text.includes(w));
  });
  const inTitle = (c: RepackCandidate) => words.every((w) => c.title.toLowerCase().includes(w));
  return [...matches.filter(inTitle), ...matches.filter((c) => !inTitle(c))].slice(0, limit);
}

/** Adds `id` to the end of the box unless it is already there. The box has no size limit. */
export function addToBox(box: readonly string[], id: string): string[] {
  if (box.includes(id)) return [...box];
  return [...box, id];
}

export function removeFromBox(box: readonly string[], id: string): string[] {
  return box.filter((x) => x !== id);
}

/** The existing lesson-less remix route, started with exactly these Parsles in this order. */
export function repackStartUrl(box: readonly string[]): string {
  return `/lesson/deep-dive-remix?lessonIds=${box.map(encodeURIComponent).join(",")}`;
}

export function parseLessonIds(param: string | null): string[] {
  return (param ?? "").split(",").filter((id) => id !== "");
}

/**
 * The chosen Parsles as remix pool entries, in the order given: only ids the
 * theme index knows and whose artifact is standard category (same rule as
 * buildRemixPool), deduped.
 */
export function buildPickedPool(
  themeIndex: ThemeIndexArtifact | null | undefined,
  skillArtifacts: Map<string, SkillArtifact>,
  ids: readonly string[],
): ThemeLessonRef[] {
  if (!themeIndex) return [];
  const refs = new Map<string, ThemeLessonRef>();
  for (const theme of themeIndex.themes) for (const lesson of theme.lessons) if (!refs.has(lesson.id)) refs.set(lesson.id, lesson);
  const seen = new Set<string>();
  const pool: ThemeLessonRef[] = [];
  for (const id of ids) {
    const ref = refs.get(id);
    if (!ref || seen.has(id)) continue;
    seen.add(id);
    if (skillArtifacts.get(refKey({ unitKey: null, skillKey: id }))?.category !== "standard") continue;
    pool.push(ref);
  }
  return pool;
}

export interface ComboboxState {
  /** Number of options currently listed. */
  count: number;
  /** Highlighted option index, -1 for none. */
  active: number;
  query: string;
}

export type ComboboxAction =
  | { type: "move"; active: number }
  | { type: "pick"; index: number }
  | { type: "clear" }
  | { type: "none" };

/**
 * What a key press in the autocomplete input does (WAI-ARIA combobox, list
 * autocomplete): arrows move the highlight and wrap, Enter picks the
 * highlighted option, Escape clears the text. Pure so it is testable.
 */
export function comboboxKeyAction(state: ComboboxState, key: string): ComboboxAction {
  const { count, active, query } = state;
  switch (key) {
    case "ArrowDown":
      return count > 0 ? { type: "move", active: active < 0 ? 0 : (active + 1) % count } : { type: "none" };
    case "ArrowUp":
      return count > 0 ? { type: "move", active: active <= 0 ? count - 1 : active - 1 } : { type: "none" };
    case "Enter":
      return count > 0 && active >= 0 && active < count ? { type: "pick", index: active } : { type: "none" };
    case "Escape":
      return query !== "" ? { type: "clear" } : { type: "none" };
    default:
      return { type: "none" };
  }
}
