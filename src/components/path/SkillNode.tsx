import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PathSkill, PositionKey } from "../../domain/pathProgress";
import { mainTagSymbol } from "../../domain/mainTag";
import { usePathTheme } from "../../theme/PathThemeContext";
import { useBootstrap } from "../../hooks/useBootstrap";
import { useThemeIndex } from "../../hooks/useCourseContent";
import { LessonStartPopover } from "./LessonStartPopover";
import { DeepDiveChooserModal } from "./DeepDiveChooserModal";
import { StowFlow } from "./StowFlow";
import { StowedMark } from "./StowedMark";
import { useSkillActions } from "./useSkillActions";
import styles from "./SkillNode.module.css";

/**
 * `"node"` is the square card the road places absolutely; `"row"` is the
 * same skill rendered as a full-width line for SkillList. One component with
 * two layouts rather than two components, so the status styling (locked /
 * unlocked / current) can't drift between them. `"story"` is the round node a
 * story hangs off the road with, for the same reason.
 */
export type SkillNodeLayout = "node" | "row" | "story";

interface SkillNodeProps {
  skill: PathSkill;
  layout?: SkillNodeLayout;
  /** The checkpoint target for "test out of this lesson" — only ever relevant to the one node that's actually "current" (see PathPage). Absent/null for SkillList, which never renders a "current" standard skill. */
  nextSkipTarget?: PositionKey | null;
  /** Set only for a fork's alternates: colours the border blue while still to do (a finished one keeps the default border). */
  markCompleted?: boolean;
  /** The other alternates at a fork's position, so a passed-over one is told apart from a lesson tested out of. */
  siblings?: readonly PathSkill[];
}

export function SkillNode({ skill, layout = "node", nextSkipTarget = null, markCompleted = false, siblings = [] }: SkillNodeProps) {
  const navigate = useNavigate();
  const theme = usePathTheme();
  // A story on the road is gated by what it follows, not just by its unit.
  const status = layout === "story" ? skill.roadStatus : skill.status;
  const locked = status === "locked";
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [stowOpen, setStowOpen] = useState(false);
  // Independent react-query subscription rather than a prop drilled down from
  // PathPage — matches Sidebar.tsx's own pattern, and costs nothing extra:
  // both queries are already cached from whichever page fetched them first.
  const bootstrap = useBootstrap();
  const themeIndex = useThemeIndex(bootstrap.data?.course ?? null);
  const actions = useSkillActions(skill, nextSkipTarget, themeIndex.data, siblings);

  function handleClick() {
    if (locked) return;

    if (skill.category !== "standard") {
      // Stories/conversations/songs are read straight through, in authored
      // order — they never become "current" (only standard positions do), and
      // GET /v1/checkpoint rejects a non-standard target, so routing them to
      // checkpoint the way standard skills go would make every one of them
      // dead on tap.
      navigate(`/story/${skill.unitKey}/${skill.skillKey}`);
      return;
    }

    // Duolingo-style: tapping a standard skill (current, a past one being
    // revisited, or the one locked placement-target node) offers a choice
    // rather than jumping straight in — see LessonStartPopover. This is also
    // the only way to reach "Review vocabulary" from a skill that isn't
    // current, since a completed skill's node otherwise has no popover at all.
    setPopoverOpen(true);
  }

  // A fork alternate still to do reads blue (its connector does too, in SkillRoad); locked ones stay grey.
  // A story still to do reads the same way.
  const openBranch = (markCompleted || layout === "story") && !skill.completed && !locked;
  const classes = [
    styles.node,
    styles[status],
    layout === "row" && styles.row,
    layout === "story" && styles.story,
    openBranch && styles.openBranch,
    skill.stowed && styles.stowed,
  ]
    .filter(Boolean)
    .join(" ");
  const icon = theme.icons[skill.category];
  // Shown on a phone only (SkillNode.module.css), alongside the title.
  const tagSymbol = layout === "node" ? mainTagSymbol(skill.themes, theme.tagSymbols, themeIndex.data) : null;
  const label =
    layout === "story"
      ? `Story: ${skill.title}${skill.completed ? ", done" : locked ? ", locked" : ""}`
      : skill.stowed
        ? `${skill.title}, stowed`
        : undefined;

  return (
    <>
      <button ref={buttonRef} type="button" className={classes} disabled={locked} onClick={handleClick} title={skill.title} aria-label={label}>
        {layout === "node" && <span className={styles.fold} aria-hidden="true" />}
        {icon != null && <span className={styles.icon}>{icon}</span>}
        {tagSymbol != null && <span className={styles.tagSymbol} aria-hidden="true">{tagSymbol}</span>}
        <span className={styles.title}>{skill.title}</span>
        {layout === "story" && skill.completed && <span className={styles.done} aria-hidden="true">✓</span>}
        {skill.stowed && <StowedMark />}
      </button>
      {popoverOpen && (
        <LessonStartPopover
          anchorRef={buttonRef}
          primaryLabel={actions.primaryLabel}
          onPrimary={actions.onPrimary}
          onDeepDive={
            actions.hasDeepDive
              ? () => {
                  setPopoverOpen(false);
                  setDeepDiveOpen(true);
                }
              : undefined
          }
          onSkip={actions.onSkip}
          onReviewVocabulary={actions.onReviewVocabulary}
          onStow={
            actions.canStow
              ? () => {
                  setPopoverOpen(false);
                  setStowOpen(true);
                }
              : undefined
          }
          onClose={() => setPopoverOpen(false)}
        />
      )}
      {deepDiveOpen && <DeepDiveChooserModal lessonKey={skill.skillKey} onClose={() => setDeepDiveOpen(false)} />}
      {stowOpen && <StowFlow lessonKey={skill.skillKey} onRetry={actions.onPrimary} onClose={() => setStowOpen(false)} />}
    </>
  );
}
