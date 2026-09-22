import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useBootstrap } from "../hooks/useBootstrap";
import { useSkillArtifactsForLessonRefs, useThemeIndex, refKey } from "../hooks/useCourseContent";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { errorMessage } from "../lib/errors";
import type { SkillRef } from "../types/api";
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
 * would overstate it. Getting that count means fetching every lesson's
 * SkillArtifact for its category, same cost useAllSkillArtifacts already
 * pays for the whole Journey path on every authenticated page — but it's
 * paid once: react-query caches each one under a key that includes the
 * course version and never marks it stale (staleTime: Infinity, the same
 * convention every other content fetch in this file uses), so it's free on
 * every later visit within that version and refetches on its own the moment
 * the version changes or the tab reloads, with no manual invalidation
 * needed.
 */
export function ThemesPage() {
  const bootstrap = useBootstrap();
  const course = bootstrap.data?.course ?? null;
  const themeIndex = useThemeIndex(course);

  const allLessonRefs = useMemo<SkillRef[]>(() => {
    const seen = new Set<string>();
    const refs: SkillRef[] = [];
    for (const theme of themeIndex.data?.themes ?? []) {
      for (const lesson of theme.lessons) {
        if (seen.has(lesson.id)) continue;
        seen.add(lesson.id);
        refs.push({ unitKey: null, skillKey: lesson.id });
      }
    }
    return refs;
  }, [themeIndex.data]);
  const { skills: skillArtifacts, isLoading: skillsLoading } = useSkillArtifactsForLessonRefs(
    course,
    themeIndex.data,
    allLessonRefs,
  );

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
