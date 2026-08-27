import { useParams } from "react-router-dom";
import { useBootstrap } from "../hooks/useBootstrap";
import { useCoursePath } from "../hooks/useCourseContent";
import { SkillList } from "../components/path/SkillList";
import { PathThemeProvider } from "../theme/PathThemeProvider";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { errorMessage } from "../lib/errors";
import type { SkillCategory } from "../domain/enums";
import styles from "./CourseSection.module.css";

const VALID_CATEGORIES: readonly SkillCategory[] = ["story", "conversation", "song"];

/** One non-standard category (story/conversation/song/…), reached via the sidebar — a generic page, not one hardcoded per category, so a new category needs no new page. */
export function CategoryPage() {
  const { category = "" } = useParams();
  const bootstrap = useBootstrap();
  const { path, isLoading, isError } = useCoursePath(bootstrap.data?.course ?? null, bootstrap.data?.position ?? null);

  if (!VALID_CATEGORIES.includes(category as SkillCategory)) {
    return <ErrorBanner message={`Unknown category "${category}".`} />;
  }

  if (bootstrap.isLoading || isLoading) return <Spinner label="Loading…" />;
  if (bootstrap.isError) return <ErrorBanner message={errorMessage(bootstrap.error, "Couldn't load your course.")} />;
  if (isError) return <ErrorBanner message="Couldn't load course content from the CDN." />;

  const unitsWithContent = path
    .map((unit) => ({ ...unit, skills: unit.otherSkills.filter((s) => s.category === category) }))
    .filter((unit) => unit.skills.length > 0);

  if (unitsWithContent.length === 0) {
    return <p>Nothing here yet.</p>;
  }

  return (
    <PathThemeProvider>
      {unitsWithContent.map((unit) => (
        <section key={unit.unitKey} className={styles.section}>
          <h2 className={styles.title}>{unit.title}</h2>
          <SkillList skills={unit.skills} />
        </section>
      ))}
    </PathThemeProvider>
  );
}
