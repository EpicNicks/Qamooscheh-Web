import { useNavigate } from "react-router-dom";
import type { PathSkill } from "../../domain/pathProgress";
import styles from "./SkillNode.module.css";

const CATEGORY_ICON: Record<PathSkill["category"], string> = {
  standard: "●",
  story: "📖",
  conversation: "💬",
  song: "🎵",
};

export function SkillNode({ skill }: { skill: PathSkill }) {
  const navigate = useNavigate();
  const locked = skill.status === "locked";

  function handleClick() {
    if (locked) return;
    if (skill.status === "current") {
      navigate("/lesson");
    } else {
      // An unlocked-but-not-current skill: offer it as a checkpoint target
      // rather than a lesson — the server only ever plans a lesson for the
      // learner's own cursor (API_SPEC.md §2.2), and re-practicing a past
      // skill directly isn't a modeled flow yet.
      navigate(`/checkpoint/${skill.unitKey}/${skill.skillKey}`);
    }
  }

  const classes = [styles.node, styles[skill.status]].join(" ");

  return (
    <button type="button" className={classes} disabled={locked} onClick={handleClick} title={skill.title}>
      <span className={styles.icon}>{CATEGORY_ICON[skill.category]}</span>
      <span className={styles.title}>{skill.title}</span>
    </button>
  );
}
