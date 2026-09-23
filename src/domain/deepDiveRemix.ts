// Weighting for the "remix all topics" Deep Dive: which lessons (across every
// theme the source lesson belongs to) to pull into a blended session, skewed
// toward more or less obscure material depending on how well the learner
// already knows the source lesson's vocabulary. No existing precedent in
// this codebase to match against — a first-cut heuristic over local FSRS
// card state, deliberately simple and documented as tunable rather than
// treated as settled scheduling math (see exerciseResolution.ts's own
// "SIMPLIFIED" card-state heuristic for the same posture elsewhere here).
import type { CardState } from "../types/api";
import type { SkillArtifact, ThemeIndexArtifact, ThemeLessonRef } from "../types/content";
import { refKey } from "./skillRefKey";
import { indexThemesById } from "./themeTree";

/**
 * The candidate lessons a remix draws from: the union of `themeIds`' own
 * (already rolled-up, so descendants included) `lessons`, deduped by id in
 * first-seen order, filtered to `category === "standard"` via
 * `skillArtifacts` (keyed by refKey, as useAllThemeSkillArtifacts returns
 * it) — story/conversation/song lessons only make sense played in sequence,
 * and themes.json currently leaks them in (a known backend gap). A lesson
 * whose artifact hasn't loaded yet is excluded, same as ThemeBrowsePage.
 * `excludeLessonKey` drops the source lesson for the lesson-anchored remix
 * ("more like this", not "this again"). Unknown theme ids are ignored.
 */
export function buildRemixPool(
  themeIndex: ThemeIndexArtifact | null | undefined,
  skillArtifacts: Map<string, SkillArtifact>,
  opts: { themeIds: string[]; excludeLessonKey?: string },
): ThemeLessonRef[] {
  if (!themeIndex) return [];
  const byId = indexThemesById(themeIndex.themes);
  const seen = new Set<string>(opts.excludeLessonKey != null ? [opts.excludeLessonKey] : []);
  const pool: ThemeLessonRef[] = [];
  for (const themeId of opts.themeIds) {
    for (const lesson of byId.get(themeId)?.lessons ?? []) {
      if (seen.has(lesson.id)) continue;
      seen.add(lesson.id);
      if (skillArtifacts.get(refKey({ unitKey: null, skillKey: lesson.id }))?.category !== "standard") continue;
      pool.push(lesson);
    }
  }
  return pool;
}

/** FSRS stability (days) treated as "fully known" for this heuristic's 0..1 scale — not a real retrievability calculation, just a rough proxy. */
const MASTERY_STABILITY_CAP = 30;

/** How many lessons a "remix all topics" Deep Dive pulls from, at most — LessonPage's own REMIX_MAX_EXERCISES-equivalent lives in useLessonEngine.ts, capping the built exercise queue rather than the lesson count directly. */
export const REMIX_MAX_LESSONS = 4;

/** A tag with no local card at all (never seen) — no signal, so it counts as unknown rather than being skipped, pulling the average down. */
function tagMastery(cardStates: Record<string, CardState>, tag: string): number {
  const card = cardStates[tag];
  if (!card) return 0;
  return Math.min(card.stability / MASTERY_STABILITY_CAP, 1);
}

/**
 * 0 (never seen any of these tags) .. 1 (all well-retained). Averaged across
 * `tags` — an empty list (a lesson whose exercises carry no lexeme tags,
 * shouldn't happen but isn't asserted against) is treated as fully unknown
 * rather than throwing, since "unknown" is the safer default for the
 * weighting below (biases toward core/frequent material, not obscure).
 */
export function computeMasteryScore(cardStates: Record<string, CardState>, tags: string[]): number {
  if (tags.length === 0) return 0;
  const total = tags.reduce((sum, tag) => sum + tagMastery(cardStates, tag), 0);
  return total / tags.length;
}

/** Fisher-Yates-backed weighted sample without replacement — same shuffle primitive as ThemeBrowsePage's "random" view. */
function weightedSample<T>(items: readonly { item: T; weight: number }[], count: number): T[] {
  const pool = [...items];
  const result: T[] = [];
  while (pool.length > 0 && result.length < count) {
    const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
    // Every remaining weight is exactly 0 (e.g. count exceeds distinct
    // scores) — degrade to a plain uniform pick rather than dividing by
    // zero forever.
    let roll = totalWeight > 0 ? Math.random() * totalWeight : Math.random() * pool.length;
    let index = 0;
    for (; index < pool.length; index++) {
      const w = totalWeight > 0 ? pool[index].weight : 1;
      if (roll < w) break;
      roll -= w;
    }
    const picked = pool.splice(Math.min(index, pool.length - 1), 1)[0];
    result.push(picked.item);
  }
  return result;
}

/**
 * Picks up to `count` lessons from `candidates`, weighted toward whichever
 * `commonUsageScore` is closest to a target derived from `masteryScore`:
 * low mastery (the learner barely knows this lesson's vocabulary yet) aims
 * near 100 — stay in core, frequent territory; high mastery aims near 0 —
 * venture into more obscure/niche material. A lesson with no authored score
 * (`null`) is treated as 50 (mid), so it's never the worst nor best fit by
 * default.
 */
export function selectRemixLessons(candidates: ThemeLessonRef[], masteryScore: number, count: number): ThemeLessonRef[] {
  const target = 100 * (1 - masteryScore);
  const weighted = candidates.map((lesson) => {
    const score = lesson.commonUsageScore ?? 50;
    return { item: lesson, weight: 1 / (1 + Math.abs(score - target)) };
  });
  return weightedSample(weighted, count);
}
