import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useBootstrap } from "../hooks/useBootstrap";
import { useAllThemeSkillArtifacts, useThemeIndex, refKey } from "../hooks/useCourseContent";
import { useCompletedLessons } from "../hooks/useCompletedLessons";
import { ThemeLessonRow } from "../components/themes/ThemeLessonRow";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Button } from "../components/common/Button";
import { errorMessage } from "../lib/errors";
import type { ThemeLessonRef } from "../types/content";
import styles from "./ThemeBrowsePage.module.css";

/** Fisher-Yates, not `Array.sort(() => Math.random() - 0.5)` — the sort-comparator trick is a well-known biased shuffle. */
function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * One theme's lesson list (API_SPEC.md §2.11) — structured (as themes.json
 * ships it, pre-sorted by commonUsageScore desc) or a client-side shuffle of
 * the same list. `?from=<lessonKey>` marks the lesson the learner arrived
 * from via a Journey recap's or popover's "Deep Dive" bridge.
 *
 * Filters out anything whose fetched SkillArtifact.category isn't
 * "standard" — content/CLAUDE.md mandates that themes.json's own publisher
 * step exclude story/conversation/song lessons from browse buckets, but
 * ArtifactBuilder.cs doesn't actually do that yet (a known backend gap, not
 * fixed here). Sourced from useAllThemeSkillArtifacts (shared with
 * ThemesPage's counts and the Journey Deep Dive remix pool — one fetch,
 * cached course-wide, not three), so switching themes costs nothing once
 * that first fetch has resolved. Waits for it to resolve before rendering
 * the list rather than filtering incrementally, so a story lesson never
 * flashes into view before disappearing.
 */
export function ThemeBrowsePage() {
  const { themeId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const fromLessonKey = searchParams.get("from");
  const navigate = useNavigate();

  const bootstrap = useBootstrap();
  const course = bootstrap.data?.course ?? null;
  const themeIndex = useThemeIndex(course);
  const completedLessons = useCompletedLessons(course?.code);
  const { skills: skillArtifacts, isLoading: skillsLoading, isError: skillsError } = useAllThemeSkillArtifacts(
    course,
    themeIndex.data,
  );

  const theme = themeIndex.data?.themes.find((t) => t.id === themeId) ?? null;

  const [randomGeneration, setRandomGeneration] = useState(0);
  const [view, setView] = useState<"structured" | "random">("structured");
  const randomOrder = useMemo(
    () => shuffle(theme?.lessons ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-shuffles only when the toggle is pressed (randomGeneration), not on every render.
    [theme, randomGeneration],
  );
  const orderedLessons: ThemeLessonRef[] = view === "random" ? randomOrder : (theme?.lessons ?? []);
  // Standard-category only (see the file header comment) — excludes a
  // lesson whose artifact hasn't resolved at all, same as one that resolved
  // to a non-standard category, since either way there's nothing safe to
  // show yet.
  const standardLessons = orderedLessons.filter(
    (lesson) => skillArtifacts.get(refKey({ unitKey: null, skillKey: lesson.id }))?.category === "standard",
  );

  if (bootstrap.isLoading || themeIndex.isLoading) return <Spinner label="Loading…" />;
  if (bootstrap.isError) return <ErrorBanner message={errorMessage(bootstrap.error, "Couldn't load your course.")} />;
  if (themeIndex.isError) return <ErrorBanner message="Couldn't load themes from the CDN." />;
  if (!theme) return <ErrorBanner message={`No theme named "${themeId}".`} />;
  if (skillsLoading) return <Spinner label="Loading lessons…" />;

  const completedKeys = new Set(completedLessons.data?.completedLessonKeys ?? []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{theme.id}</h1>
        <div className={styles.toggle}>
          <Button
            variant={view === "structured" ? "primary" : "secondary"}
            onClick={() => setView("structured")}
          >
            Structured
          </Button>
          <Button
            variant={view === "random" ? "primary" : "secondary"}
            onClick={() => {
              setView("random");
              setRandomGeneration((g) => g + 1);
            }}
          >
            Random
          </Button>
        </div>
      </div>

      {skillsError && <ErrorBanner message="Some lessons couldn't be loaded." />}

      {standardLessons.length === 0 ? (
        <p>Nothing browsable in this theme right now.</p>
      ) : (
        <div className={styles.list}>
          {standardLessons.map((lesson) => {
            const artifact = skillArtifacts.get(refKey({ unitKey: null, skillKey: lesson.id }));
            return (
              <ThemeLessonRow
                key={lesson.id}
                title={artifact?.title ?? lesson.id}
                commonUsageScore={lesson.commonUsageScore}
                completed={completedKeys.has(lesson.id)}
                highlighted={lesson.id === fromLessonKey}
                onSelect={() => navigate(`/lesson/deep-dive/${encodeURIComponent(lesson.id)}`)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
