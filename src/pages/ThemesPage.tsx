import { Link } from "react-router-dom";
import { useBootstrap } from "../hooks/useBootstrap";
import { useAllThemeSkillArtifacts, useThemeIndex, refKey } from "../hooks/useCourseContent";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { errorMessage } from "../lib/errors";
import styles from "./ThemesPage.module.css";

/**
 * The theme-browsing hub (API_SPEC.md §2.11): one entry per tag in
 * themes.json, labelled by the tag itself — the backend sends no separate
 * display `name`, the tag id ("Food", "Restaurant", …) is the label.
 *
 * The per-theme count only counts standard-category lessons, matching what
 * ThemeBrowsePage actually shows once you drill in — themes.json currently
 * leaks story-category lessons into its buckets (a known backend gap, see
 * ThemeBrowsePage's own doc comment), so the raw `theme.lessons.length`
 * would overstate it. Sourced from useAllThemeSkillArtifacts, which fetches
 * every theme-tagged lesson's artifact once and shares it with
 * ThemeBrowsePage and the Journey Deep Dive remix pool — see that hook's own
 * doc comment for why this is one shared cached fetch, not three.
 */
export function ThemesPage() {
  const bootstrap = useBootstrap();
  const course = bootstrap.data?.course ?? null;
  const themeIndex = useThemeIndex(course);
  const { skills: skillArtifacts, isLoading: skillsLoading } = useAllThemeSkillArtifacts(course, themeIndex.data);

  if (bootstrap.isLoading || themeIndex.isLoading || skillsLoading) return <Spinner label="Loading themes…" />;
  if (bootstrap.isError) return <ErrorBanner message={errorMessage(bootstrap.error, "Couldn't load your course.")} />;
  if (themeIndex.isError) return <ErrorBanner message="Couldn't load themes from the CDN." />;

  const themes = themeIndex.data?.themes ?? [];
  if (themes.length === 0) {
    return <p>No themed lessons yet for this course.</p>;
  }

  return (
    <div className={styles.grid}>
      {themes.map((theme) => {
        const standardCount = theme.lessons.filter(
          (lesson) => skillArtifacts.get(refKey({ unitKey: null, skillKey: lesson.id }))?.category === "standard",
        ).length;
        return (
          <Link key={theme.id} to={`/themes/${encodeURIComponent(theme.id)}`} className={styles.card}>
            <span className={styles.name}>{theme.id}</span>
            <span className={styles.count}>{standardCount} lessons</span>
          </Link>
        );
      })}
    </div>
  );
}
