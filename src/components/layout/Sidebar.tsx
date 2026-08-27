import { NavLink } from "react-router-dom";
import { useBootstrap } from "../../hooks/useBootstrap";
import { useCoursePath } from "../../hooks/useCourseContent";
import type { SkillCategory } from "../../domain/enums";
import styles from "./Sidebar.module.css";

const CATEGORY_LABEL: Record<Exclude<SkillCategory, "standard">, string> = {
  story: "Stories",
  conversation: "Conversations",
  song: "Songs",
};

/**
 * Course-content navigation: the journey (standard skills) plus one entry
 * per non-standard category actually present in this course — derived from
 * the same useCoursePath data the journey/library pages already fetch
 * (react-query cache, not a second network round trip), rather than a
 * hardcoded Story/Conversation/Song list that would show empty entries for
 * a course that hasn't authored one of those yet.
 */
export function Sidebar() {
  const bootstrap = useBootstrap();
  const { path } = useCoursePath(bootstrap.data?.course ?? null, bootstrap.data?.position ?? null);

  const categories = new Set<Exclude<SkillCategory, "standard">>();
  for (const unit of path) {
    for (const skill of unit.otherSkills) {
      if (skill.category !== "standard") categories.add(skill.category);
    }
  }

  return (
    <nav className={styles.sidebar}>
      <NavLink to="/path" className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}>
        Journey
      </NavLink>
      {[...categories].map((category) => (
        <NavLink
          key={category}
          to={`/library/${category}`}
          className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
        >
          {CATEGORY_LABEL[category]}
        </NavLink>
      ))}
    </nav>
  );
}
