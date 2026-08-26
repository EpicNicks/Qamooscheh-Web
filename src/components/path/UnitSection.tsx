import type { PathUnit } from "../../domain/pathProgress";
import { SkillRoad } from "./SkillRoad";
import { SkillList } from "./SkillList";
import styles from "./UnitSection.module.css";

/**
 * One unit, in its two registers: the standard skills as a winding branching
 * road (the sequence the cursor actually walks), then everything else as a
 * plain arc-grouped list underneath.
 */
export function UnitSection({ unit }: { unit: PathUnit }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{unit.title}</h2>
      <SkillRoad positions={unit.standardPositions} />
      <SkillList skills={unit.otherSkills} />
    </section>
  );
}
