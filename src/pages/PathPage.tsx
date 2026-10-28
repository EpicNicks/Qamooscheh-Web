import { useEffect, useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useBootstrap } from "../hooks/useBootstrap";
import { useIsMobile } from "../hooks/useMediaQuery";
import { useCoursePath } from "../hooks/useCourseContent";
import { findNextStandardTarget, findNextUnitEntryTarget } from "../domain/pathProgress";
import { SkillRoad } from "../components/path/SkillRoad";
import { PlacementTestNode } from "../components/path/PlacementTestNode";
import { DailyGoalRing } from "../components/path/DailyGoalRing";
import { JumpToCurrentButton } from "../components/path/JumpToCurrentButton";
import { CourseUpdateBanner } from "../components/course/CourseUpdateBanner";
import { StowReminderModal } from "../components/path/StowReminderModal";
import { BookIcon } from "../components/common/icons";
import { PathThemeProvider } from "../theme/PathThemeProvider";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { errorMessage } from "../lib/errors";
import styles from "./CourseSection.module.css";

/** The learning journey: the standard skills as the straight branching road, with each unit's stories branching off it. All story/conversation/song content is also browsable in its per-category page (CategoryPage), reached via the sidebar. */
export function PathPage() {
  const bootstrap = useBootstrap();
  const isMobile = useIsMobile();
  const { path, isLoading, isError } = useCoursePath(bootstrap.data?.course ?? null, bootstrap.data?.position ?? null);
  // At most one position across the whole journey is ever "current" — computed
  // once here and handed to every unit's road, rather than each SkillNode
  // re-deriving it, since only the one node that's actually current ever uses it.
  const nextSkipTarget = findNextStandardTarget(path);
  // Same reasoning: at most one unit boundary is ever offered for skipping
  // (GitHub #4) — the next unit only, not any future one (see
  // findNextUnitEntryTarget's own doc on why).
  const nextUnitEntryTarget = findNextUnitEntryTarget(path);

  const pageRef = useRef<HTMLDivElement>(null);
  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const goalRowRef = useRef<HTMLDivElement>(null);

  // Each unit's own sticky title (.title) sticks right below this wrapper,
  // not underneath it — but CSS sticky positioning has no idea about a
  // sibling's height, so .title's own `top` needs this wrapper's real
  // rendered height (it varies: the update banner is only sometimes there,
  // and the ring's row can wrap on a narrow screen) added to --header-height.
  // Mirrors AppShell.tsx's own --header-height measurement for the same
  // reason: a ResizeObserver, not a one-off read, since content changing
  // after mount (the banner appearing/disappearing) has to keep it in sync.
  //
  // The goal row's own height and the ring's width are measured too: a unit's
  // sticky title pins on the same line as the ring, at the same height, and
  // narrow enough to stop short of it (CourseSection.module.css's .title).
  useLayoutEffect(() => {
    const header = stickyHeaderRef.current;
    const goalRow = goalRowRef.current;
    const container = pageRef.current;
    if (!header || !goalRow || !container) return;
    const observer = new ResizeObserver(() => {
      container.style.setProperty("--sticky-header-height", `${header.offsetHeight}px`);
      container.style.setProperty("--goal-row-height", `${goalRow.offsetHeight}px`);
      const ring = goalRow.firstElementChild as HTMLElement | null;
      container.style.setProperty("--goal-width", `${ring?.offsetWidth ?? 0}px`);
    });
    observer.observe(header);
    observer.observe(goalRow);
    if (goalRow.firstElementChild) observer.observe(goalRow.firstElementChild);
    return () => observer.disconnect();
  }, [isLoading, isError, isMobile]);

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
    <PathThemeProvider containerRef={pageRef}>
      <div ref={stickyHeaderRef} className={styles.stickyHeader}>
        <div ref={goalRowRef} className={styles.headerRow}>
          {/* On mobile the ring sits in the app header instead (AppShell). */}
          {!isMobile && <DailyGoalRing courseCode={bootstrap.data?.course?.code} />}
        </div>
        {bootstrap.data?.update && bootstrap.data.course && (
          <CourseUpdateBanner course={bootstrap.data.course} update={bootstrap.data.update} />
        )}
      </div>
      {path.map((unit) => (
        <section key={unit.unitKey} className={styles.section}>
          <h2 className={styles.title}>
            <span className={styles.titleText}>{unit.title}</span>
            {unit.deferred && (
              <span className={styles.deferred} title="A stowed Parsle in this unit is waiting for another try">
                Stowed Parsle waiting
              </span>
            )}
            <Link
              to={`/vocabulary/${unit.unitKey}`}
              className={styles.vocabLink}
              aria-label={`Review vocabulary for ${unit.title}`}
              title="Review vocabulary"
            >
              <BookIcon size="1.25rem" />
            </Link>
          </h2>
          {nextUnitEntryTarget?.unitKey === unit.unitKey && <PlacementTestNode target={nextUnitEntryTarget} />}
          <SkillRoad unit={unit} nextSkipTarget={nextSkipTarget} />
        </section>
      ))}
      <JumpToCurrentButton containerRef={pageRef} watchKey={path} />
      <StowReminderModal path={path} />
    </PathThemeProvider>
  );
}
