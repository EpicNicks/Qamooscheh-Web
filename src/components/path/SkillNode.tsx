import { useNavigate } from "react-router-dom";
import type { PathSkill } from "../../domain/pathProgress";
import { usePathTheme } from "../../theme/PathThemeContext";
import styles from "./SkillNode.module.css";

/**
 * `"node"` is the 84px square card the road places absolutely; `"row"` is the
 * same skill rendered as a full-width line for SkillList. One component with
 * two layouts rather than two components, so the status styling (locked /
 * unlocked / current) can't drift between them.
 */
export type SkillNodeLayout = "node" | "row";

export function SkillNode({ skill, layout = "node" }: { skill: PathSkill; layout?: SkillNodeLayout }) {
  const navigate = useNavigate();
  const theme = usePathTheme();
  const locked = skill.status === "locked";

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

  const classes = [styles.node, styles[skill.status], layout === "row" && styles.row].filter(Boolean).join(" ");

  return (
    <button type="button" className={classes} disabled={locked} onClick={handleClick} title={skill.title}>
      <span className={styles.icon}>{theme.icons[skill.category]}</span>
      <span className={styles.title}>{skill.title}</span>
    </button>
  );
}
