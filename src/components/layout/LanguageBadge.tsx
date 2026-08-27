import { useBootstrap } from "../../hooks/useBootstrap";
import { getLanguageInfo } from "../../domain/language";
import styles from "./LanguageBadge.module.css";

/**
 * The current course's language, top-right of AppShell. Display only — there
 * is no endpoint to switch which course a user is pinned to yet (user_course
 * is a single row per user), so this isn't a toggle. Once multi-course
 * switching exists server-side, this is the natural place to turn it into
 * one.
 */
export function LanguageBadge() {
  const bootstrap = useBootstrap();
  const info = getLanguageInfo(bootstrap.data?.course.code);
  if (!info) return null;

  const gradient = `linear-gradient(to bottom, ${info.flagColors.join(", ")})`;

  return (
    <span className={styles.badge} style={{ backgroundImage: gradient }} title={info.displayName}>
      {info.flagCode}
    </span>
  );
}
