import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PositionKey } from "../../domain/pathProgress";
import { LessonStartPopover } from "./LessonStartPopover";
import nodeStyles from "./SkillNode.module.css";
import styles from "./PlacementTestNode.module.css";

/**
 * The "skip ahead" affordance for a unit the learner hasn't reached yet
 * (GitHub #4) — the single next unit past the cursor's own, per
 * domain/pathProgress.ts's findNextUnitEntryTarget. Rendered once, above that
 * unit's own road, as its own node rather than dressing up one of the unit's
 * real lesson nodes: the earlier approach marked whichever skill
 * findNextUnitEntryTarget happened to name as a "locked but clickable" variant
 * of SkillNode, which broke entirely whenever that skill was one alternate of
 * a fork — SkillGroupNode (the mobile stand-in for a fork) had no placement
 * variant at all, so the entry point was simply unreachable there. A
 * freestanding node sidesteps the fork question altogether: it targets the
 * *position*, not any one alternate in it, so SkillNode/SkillGroupNode never
 * need to know placement testing exists.
 */
export function PlacementTestNode({ target }: { target: PositionKey }) {
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <div className={styles.wrap}>
      <button
        ref={buttonRef}
        type="button"
        className={[nodeStyles.node, nodeStyles.row, styles.node].join(" ")}
        onClick={() => setPopoverOpen(true)}
        title="Take a placement test to skip ahead into this unit"
      >
        <span className={[nodeStyles.icon, styles.icon].join(" ")}>⚡</span>
        <span className={[nodeStyles.title, styles.title].join(" ")}>Skip ahead</span>
      </button>
      {popoverOpen && (
        <LessonStartPopover
          anchorRef={buttonRef}
          primaryLabel="Take the placement test"
          description="One attempt, no retries: pass it and you'll skip straight past this whole unit."
          onPrimary={() => navigate(`/checkpoint/${target.unitKey}/${target.skillKey}`)}
          onClose={() => setPopoverOpen(false)}
        />
      )}
    </div>
  );
}
