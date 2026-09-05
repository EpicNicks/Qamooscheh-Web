import { useEffect } from "react";
import { useBootstrap } from "../hooks/useBootstrap";
import { useCoursePath } from "../hooks/useCourseContent";
import { findNextStandardTarget } from "../domain/pathProgress";
import { SkillRoad } from "../components/path/SkillRoad";
import { CourseUpdateBanner } from "../components/course/CourseUpdateBanner";
import { PathThemeProvider } from "../theme/PathThemeProvider";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { errorMessage } from "../lib/errors";
import styles from "./CourseSection.module.css";

/** The learning journey: standard skills only, as the straight branching road. Story/conversation/song content lives in its own per-category page (CategoryPage), reached via the sidebar. */
export function PathPage() {
  const bootstrap = useBootstrap();
  const { path, isLoading, isError } = useCoursePath(bootstrap.data?.course ?? null, bootstrap.data?.position ?? null);
  // At most one position across the whole journey is ever "current" — computed
  // once here and handed to every unit's road, rather than each SkillNode
  // re-deriving it, since only the one node that's actually current ever uses it.
  const nextSkipTarget = findNextStandardTarget(path);

  // Genuinely synchronizing with an external system (the browser's scroll
  // position), not deriving render output — a real effect, not a render-time
  // adjustment. `scrollIntoView({block: "center"})` already does exactly the
  // "center it, unless that would scroll past the very first element" logic
  // on its own: a browser can't scroll past 0, so centering a node close to
  // the top just clamps to showing from the top instead, for free.
  useEffect(() => {
    if (isLoading || isError || path.length === 0) return;
    document.querySelector("[data-current-node]")?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [isLoading, isError, path]);

  if (bootstrap.isLoading || isLoading) return <Spinner label="Loading your course…" />;
  if (bootstrap.isError) return <ErrorBanner message={errorMessage(bootstrap.error, "Couldn't load your course.")} />;
  if (isError) return <ErrorBanner message="Couldn't load course content from the CDN." />;

  // Explicit rather than relying on PathThemeContext's default, so the point
  // where a culture-specific skin would be swapped in is visible in the tree.
  return (
    <PathThemeProvider>
      {bootstrap.data?.update && bootstrap.data.course && (
        <CourseUpdateBanner courseCode={bootstrap.data.course.code} update={bootstrap.data.update} />
      )}
      {path.map((unit) => (
        <section key={unit.unitKey} className={styles.section}>
          <h2 className={styles.title}>{unit.title}</h2>
          <SkillRoad positions={unit.standardPositions} nextSkipTarget={nextSkipTarget} />
        </section>
      ))}
    </PathThemeProvider>
  );
}
