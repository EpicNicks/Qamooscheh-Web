import { groupByArc, type PathSkill } from "../../domain/pathProgress";
import { SkillNode } from "./SkillNode";
import styles from "./SkillList.module.css";

/**
 * Stories, conversations and songs — deliberately a plain vertical stack
 * rather than a second winding road. These sit outside user_progress's
 * sequence entirely (they unlock by unit, not by position), so drawing them
 * with the road's branching vocabulary would imply an ordering gate that
 * doesn't exist.
 *
 * Chapters of one narrative are the exception worth marking: skills sharing
 * an `arc` nest under a rail so a continuing story reads as one thing. That's
 * a readability aid, not a lock — every chapter is tappable the moment its
 * unit is.
 */
export function SkillList({ skills }: { skills: PathSkill[] }) {
  if (skills.length === 0) return null;

  const groups = groupByArc(skills);

  return (
    <div className={styles.list}>
      {groups.map((group) =>
        group.arc === null || group.skills.length === 1 ? (
          group.skills.map((skill) => <SkillNode key={skill.skillKey} skill={skill} layout="row" />)
        ) : (
          <div key={group.key} className={styles.arcGroup}>
            {group.skills.map((skill) => (
              <SkillNode key={skill.skillKey} skill={skill} layout="row" />
            ))}
          </div>
        ),
      )}
    </div>
  );
}
