import type { PathUnit } from "../../domain/pathProgress";
import { SkillNode } from "./SkillNode";
import styles from "./UnitSection.module.css";

export function UnitSection({ unit }: { unit: PathUnit }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{unit.title}</h2>
      <div className={styles.grid}>
        {unit.skills.map((skill) => (
          <SkillNode key={skill.skillKey} skill={skill} />
        ))}
      </div>
    </section>
  );
}
