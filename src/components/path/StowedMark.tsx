import styles from "./StowedMark.module.css";

/**
 * What marks a stowed Parsle on the path besides its gray card
 * (SkillNode.module.css's `.stowed`). A placeholder until the Rive art for a
 * Parsle in storage exists (Taiga #40): the art replaces this component, and
 * those two places are the whole of how a stowed node looks.
 */
export function StowedMark() {
  return (
    <span className={styles.mark} role="img" aria-label="Stowed">
      Stowed
    </span>
  );
}
