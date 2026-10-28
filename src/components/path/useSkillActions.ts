import { useNavigate } from "react-router-dom";
import { isPassedOverAlternate, skillStartRoute } from "../../domain/skillRoute";
import type { PathSkill, PositionKey } from "../../domain/pathProgress";
import { themesForLesson } from "../../domain/themeLookup";
import type { ThemeIndexArtifact } from "../../types/content";
import { useBootstrap } from "../../hooks/useBootstrap";
import { emitStowEvent } from "../../lib/stowEvents";

export interface SkillActions {
  /** "Start Parsle" for the current skill or one never completed, "Practice" for a completed one being revisited. */
  primaryLabel: string;
  onPrimary: () => void;
  /** Only present on the current skill when there's a position ahead to test into. */
  onSkip?: () => void;
  onReviewVocabulary: () => void;
  /**
   * Whether to show the "Deep Dive" button at all — a standard-category
   * skill tagged with at least one theme. Not a callback: opening the
   * chooser modal is local UI state (SkillNode/SkillGroupModal own it), not
   * a navigation action like the others here.
   */
  hasDeepDive: boolean;
  /** Whether Stow is offered: a journey lesson the server lists in `stowableLessonKeys` (a failed attempt on record, not yet passed or stowed). */
  canStow: boolean;
}

/**
 * The three "what happens when you tap a start/test-out/review-vocab button"
 * decisions, lifted out of SkillNode so LessonStartPopover's single-skill
 * popover and SkillGroupModal's multi-skill dialog (a mobile-collapsed fork)
 * can't diverge — see LessonStartPopover.tsx's own long comment on why
 * /lesson vs /practice/:unit/:skill is decided the way it is below.
 *
 * `skill` may be null while a list has no selection (SkillGroupModal before
 * its list has focus); the returned callbacks are then no-ops.
 */
export function useSkillActions(
  skill: PathSkill | null,
  nextSkipTarget: PositionKey | null,
  themeIndex?: ThemeIndexArtifact | null,
  /** Every alternate at the skill's position (including itself); omit for a lone lesson. */
  siblings: readonly PathSkill[] = [],
): SkillActions {
  const navigate = useNavigate();
  const stowableKeys = useBootstrap().data?.stowableLessonKeys;

  function primaryAction() {
    if (!skill) return;
    if (skill.stowed) emitStowEvent("stowResumed", skill.skillKey);
    // See skillStartRoute for why /lesson, /practice and a graded /practice
    // are chosen the way they are.
    navigate(skillStartRoute(skill, siblings));
  }

  return {
    // A passed-over fork alternate was never completed, so it's a first attempt, not practice.
    // A stowed lesson was never passed, so it is a first attempt, not practice.
    primaryLabel:
      skill?.status === "current" || skill?.stowed || (skill != null && isPassedOverAlternate(skill, siblings))
        ? "Start Parsle"
        : "Practice",
    onPrimary: primaryAction,
    onSkip:
      skill?.status === "current" && nextSkipTarget
        ? () => navigate(`/checkpoint/${nextSkipTarget.unitKey}/${nextSkipTarget.skillKey}`)
        : undefined,
    onReviewVocabulary: () => {
      if (skill) navigate(`/vocabulary/${skill.unitKey}/${skill.skillKey}`);
    },
    hasDeepDive:
      skill != null && skill.category === "standard" && themesForLesson(themeIndex, skill.skillKey).length > 0,
    canStow: skill != null && skill.category === "standard" && !skill.stowed && (stowableKeys?.includes(skill.skillKey) ?? false),
  };
}
