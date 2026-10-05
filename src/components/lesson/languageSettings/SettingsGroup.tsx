import type { ReactNode } from "react";
import styles from "./SettingsGroup.module.css";

/**
 * One titled group in the lesson cog's popover (LanguageSettingsButton) —
 * text display, reading aids, hover hints, audio — so its many toggles read
 * as a few short lists rather than one long one. Each group after the first
 * gets a rule above it.
 */
export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.group} aria-label={title}>
      <h3 className={styles.title}>{title}</h3>
      {children}
    </section>
  );
}
