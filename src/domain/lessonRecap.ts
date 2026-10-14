// The lesson recap's pure logic: the fill -> burst -> reveal sequence, the
// easing it runs on, and what the Deep Dive panel shows. Kept apart from the
// components so the ordering and the chip cap can be tested without a DOM.

/** The recap's animation phases, in order. A lesson with nothing to celebrate skips "burst". */
export type RecapPhase = "fill" | "burst" | "reveal";

/** Ring fill length; the fill sound runs for the same time (domain/sfx.ts). */
export const RECAP_FILL_MS = 1900;
/** How long the burst holds before the text is revealed (its particles keep flying into the reveal). */
export const RECAP_BURST_MS = 450;

/** Ease-out cubic: quick start, long settle. `t` is clamped to 0..1. */
export function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - c, 3);
}

/** The percentage shown at eased `progress` (0..1) on the way to `target`. */
export function countAt(progress: number, target: number): number {
  return Math.round(Math.min(1, Math.max(0, progress)) * target);
}

/** The phase after `phase` finishes. "reveal" is terminal. */
export function nextRecapPhase(phase: RecapPhase, celebrate: boolean): RecapPhase {
  if (phase === "fill") return celebrate ? "burst" : "reveal";
  if (phase === "burst") return "reveal";
  return "reveal";
}

/** The not-passed ring's pass-mark tick waits for the fill to land, so it can't give the result away early. */
export function showPassMarkTick(phase: RecapPhase): boolean {
  return phase !== "fill";
}

/** Where the sequence starts: reduced motion shows the final state immediately. */
export function initialRecapPhase(reducedMotion: boolean): RecapPhase {
  return reducedMotion ? "reveal" : "fill";
}

/**
 * Whether the recap gets a burst: the lesson was passed, or the server
 * credited XP. A practice round or an already-recorded lesson earns neither.
 */
export function shouldCelebrate(lessonCompleted: boolean | null, sessionXp: number | null): boolean {
  return lessonCompleted === true || (sessionXp ?? 0) > 0;
}

/** A flawless score (a forgiven typo makes it less than 1) gets the bigger burst and its own title. */
export function isPerfectScore(score: number): boolean {
  return score >= 1;
}

/** Burst particle counts: a perfect lesson gets about twice as many. */
export function burstParticleCount(perfect: boolean): number {
  return perfect ? 28 : 14;
}

/** Most topics shown as chips in the Deep Dive panel; the rest collapse into "+N more". */
export const DEEP_DIVE_MAX_CHIPS = 3;

export interface TopicChips {
  shown: string[];
  /** How many topics didn't fit. */
  hidden: number;
}

/** The first `max` topic ids as chips, and the count left over. */
export function selectTopicChips(topicIds: readonly string[], max: number = DEEP_DIVE_MAX_CHIPS): TopicChips {
  return { shown: topicIds.slice(0, max), hidden: Math.max(0, topicIds.length - max) };
}

/** The lesson-less remix route for these topics (LessonPage's isThemeRemixRoute). */
export function remixTopicsPath(topicIds: readonly string[]): string {
  return `/lesson/deep-dive-remix?themeIds=${topicIds.map(encodeURIComponent).join(",")}`;
}
