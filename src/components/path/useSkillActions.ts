import { useNavigate } from "react-router-dom";
import type { PathSkill, PositionKey } from "../../domain/pathProgress";

export interface SkillActions {
  /** "Start lesson" for the current skill, "Practice" for one being revisited. */
  primaryLabel: string;
  onPrimary: () => void;
  /** Only present on the current skill when there's a position ahead to test into. */
  onSkip?: () => void;
  onReviewVocabulary: () => void;
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
export function useSkillActions(skill: PathSkill | null, nextSkipTarget: PositionKey | null): SkillActions {
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
  };
}
