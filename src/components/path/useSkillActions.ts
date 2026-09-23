import { useNavigate } from "react-router-dom";
import type { PathSkill, PositionKey } from "../../domain/pathProgress";
import { themesForLesson } from "../../domain/themeLookup";
import type { ThemeIndexArtifact } from "../../types/content";

export interface SkillActions {
  /** "Start lesson" for the current skill, "Practice" for one being revisited. */
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
): SkillActions {
  const navigate = useNavigate();

  function primaryAction() {
    if (!skill) return;
    if (skill.status === "current") {
      navigate("/lesson");
    } else {
      // An unlocked-but-not-current standard skill is BEHIND the learner's
      // cursor (see pathProgress.ts) — already passed, being revisited. The
      // server only ever plans a lesson for the learner's own cursor
      // (API_SPEC.md §2.2), so /lesson can't serve it; checkpoint is the
      // wrong direction too, since GET /v1/checkpoint only accepts targets
      // strictly ahead of the cursor and 400s on anything at or behind it.
      // useSkillWalkthrough already loads one named skill from the CDN and
      // submits it outside the cursor sequence, so route there instead.
      navigate(`/practice/${skill.unitKey}/${skill.skillKey}`);
    }
  }

  return {
    primaryLabel: skill?.status === "current" ? "Start lesson" : "Practice",
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
  };
}
