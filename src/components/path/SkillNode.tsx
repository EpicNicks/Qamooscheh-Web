import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PathSkill, PositionKey } from "../../domain/pathProgress";
import { usePathTheme } from "../../theme/PathThemeContext";
import { LessonStartPopover } from "./LessonStartPopover";
import { useSkillActions } from "./useSkillActions";
import styles from "./SkillNode.module.css";

/**
 * `"node"` is the 84px square card the road places absolutely; `"row"` is the
 * same skill rendered as a full-width line for SkillList. One component with
 * two layouts rather than two components, so the status styling (locked /
 * unlocked / current) can't drift between them.
 */
export type SkillNodeLayout = "node" | "row";

interface SkillNodeProps {
  skill: PathSkill;
  layout?: SkillNodeLayout;
  /** The checkpoint target for "test out of this lesson" — only ever relevant to the one node that's actually "current" (see PathPage). Absent/null for SkillList, which never renders a "current" standard skill. */
  nextSkipTarget?: PositionKey | null;
}

export function SkillNode({ skill, layout = "node", nextSkipTarget = null }: SkillNodeProps) {
  const navigate = useNavigate();
  const theme = usePathTheme();
  const locked = skill.status === "locked";
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const actions = useSkillActions(skill, nextSkipTarget);

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

  const classes = [styles.node, styles[skill.status], layout === "row" && styles.row].filter(Boolean).join(" ");

  return (
    <>
      <button ref={buttonRef} type="button" className={classes} disabled={locked} onClick={handleClick} title={skill.title}>
        <span className={styles.icon}>{theme.icons[skill.category]}</span>
        <span className={styles.title}>{skill.title}</span>
      </button>
      {popoverOpen && (
        <LessonStartPopover
          anchorRef={buttonRef}
          primaryLabel={actions.primaryLabel}
          onPrimary={actions.onPrimary}
          onSkip={actions.onSkip}
          onReviewVocabulary={actions.onReviewVocabulary}
          onClose={() => setPopoverOpen(false)}
        />
      )}
    </>
  );
}
