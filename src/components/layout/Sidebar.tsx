import { NavLink } from "react-router-dom";
import { useBootstrap } from "../../hooks/useBootstrap";
import { useCoursePath } from "../../hooks/useCourseContent";
import { glossaryForCourse } from "../../domain/glossaryContent";
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
export function Sidebar({ variant = "rail" }: { variant?: "rail" | "drawer" }) {
  const bootstrap = useBootstrap();
  const { path } = useCoursePath(bootstrap.data?.course ?? null, bootstrap.data?.position ?? null);
  const hasGlossary = glossaryForCourse(bootstrap.data?.course?.code).length > 0;

  const categories = new Set<Exclude<SkillCategory, "standard">>();
  for (const unit of path) {
    for (const skill of unit.otherSkills) {
      if (skill.category !== "standard") categories.add(skill.category);
    }
  }

  return (
    <nav className={variant === "drawer" ? `${styles.sidebar} ${styles.drawer}` : styles.sidebar}>
      <NavLink to="/path" className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}>
        Journey
      </NavLink>
      {/* Unconditional, unlike the category links below — themes are common
          enough across courses that a sparse page is an acceptable empty
          state, and checking themeIndex.themes.length here would mean every
          page paint pays for fetching themes.json, which nothing else
          currently does. */}
      <NavLink to="/themes" className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}>
        Explore
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
      {hasGlossary && (
        <NavLink to="/glossary" className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}>
          Glossary
        </NavLink>
      )}
    </nav>
  );
}
