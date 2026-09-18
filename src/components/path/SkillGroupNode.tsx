import { useRef, useState } from "react";
import type { PathPosition, PositionKey } from "../../domain/pathProgress";
import { usePathTheme } from "../../theme/PathThemeContext";
import { SkillGroupModal } from "./SkillGroupModal";
import nodeStyles from "./SkillNode.module.css";
import styles from "./SkillGroupNode.module.css";

/**
 * The mobile stand-in for a forked standard position: one card instead of N,
 * opening SkillGroupModal to let the learner pick an alternate. Only ever
 * rendered for a `positions[i].skills.length > 1` position — which, since a
 * fork only ever comes from `standardPositions` (pathProgress.ts), means
 * every skill inside is guaranteed `category === "standard"`; this never
 * needs SkillNode's `/story/...` branch.
 *
 * Imports SkillNode.module.css for the status classes (locked/unlocked/
 * current) rather than restating them, so the two node kinds can't drift in
 * colouring the way SkillNode's own `row`/`node` layouts don't.
 */
export function SkillGroupNode({ position, nextSkipTarget }: { position: PathPosition; nextSkipTarget: PositionKey | null }) {
  const theme = usePathTheme();
  const locked = position.status === "locked";
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const titles = position.skills.map((s) => s.title);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={[nodeStyles.node, nodeStyles[position.status], styles.group].join(" ")}
        disabled={locked}
        onClick={() => setModalOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${position.skills.length} lesson choices: ${titles.join(", ")}`}
        title={titles.join(" · ")}
      >
        <span className={nodeStyles.icon}>{theme.icons.standard}</span>
        <span className={nodeStyles.title}>{position.skills.length} lessons</span>
        <span className={styles.countPill}>{position.skills.length}</span>
      </button>
      {modalOpen && (
        <SkillGroupModal skills={position.skills} nextSkipTarget={nextSkipTarget} originRef={buttonRef} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
