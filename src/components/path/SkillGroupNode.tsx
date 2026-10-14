import { useRef, useState } from "react";
import { mainTagSymbol } from "../../domain/mainTag";
import { positionBranches, type PathPosition, type PositionKey } from "../../domain/pathProgress";
import { usePathTheme } from "../../theme/PathThemeContext";
import { useBootstrap } from "../../hooks/useBootstrap";
import { useThemeIndex } from "../../hooks/useCourseContent";
import { SkillGroupModal } from "./SkillGroupModal";
import { DeepDiveChooserModal } from "./DeepDiveChooserModal";
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
  const [deepDiveLessonKey, setDeepDiveLessonKey] = useState<string | null>(null);
  const bootstrap = useBootstrap();
  const themeIndex = useThemeIndex(bootstrap.data?.course ?? null);
  const branches = positionBranches(position);
  const titles = position.skills.map((s) => s.title);
  const tagSymbol = mainTagSymbol(position.skills[0].themes, theme.tagSymbols, themeIndex.data);

  return (
    <>
      <span className={styles.deck}>
        <button
          ref={buttonRef}
          type="button"
          className={[nodeStyles.node, nodeStyles[position.status]].join(" ")}
          disabled={locked}
          onClick={() => setModalOpen(true)}
          aria-haspopup="dialog"
          aria-label={`${position.skills.length} lesson choices${branches ? `, ${branches.done} of ${branches.total} done` : ""}: ${titles.join(", ")}`}
          title={titles.join(" · ")}
        >
          <span className={nodeStyles.fold} aria-hidden="true" />
          {theme.icons.standard != null && <span className={nodeStyles.icon}>{theme.icons.standard}</span>}
          {tagSymbol != null && <span className={nodeStyles.tagSymbol} aria-hidden="true">{tagSymbol}</span>}
          <span className={nodeStyles.title}>{position.skills.length} lessons</span>
          <span className={styles.countPill}>{position.skills.length}</span>
          {branches && branches.done > 0 && (
            <span className={styles.doneCount} aria-hidden="true">
              {branches.done}/{branches.total} done
            </span>
          )}
        </button>
      </span>
      {modalOpen && (
        <SkillGroupModal
          skills={position.skills}
          nextSkipTarget={nextSkipTarget}
          originRef={buttonRef}
          onClose={() => setModalOpen(false)}
          onDeepDive={(skillKey) => {
            setModalOpen(false);
            setDeepDiveLessonKey(skillKey);
          }}
          themeIndex={themeIndex.data}
        />
      )}
      {deepDiveLessonKey && (
        <DeepDiveChooserModal lessonKey={deepDiveLessonKey} onClose={() => setDeepDiveLessonKey(null)} />
      )}
    </>
  );
}
