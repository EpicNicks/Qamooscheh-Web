import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useLessonEngine, type SubmitAnswerResult, type LessonExerciseInstance } from "../hooks/useLessonEngine";
import { useExerciseSession } from "../hooks/useExerciseSession";
import { useBootstrap } from "../hooks/useBootstrap";
import { useAuth } from "../auth/useAuth";
import { useCoursePath, useAllThemeSkillArtifacts, useThemeIndex, refKey } from "../hooks/useCourseContent";
import { isFirstStandardPosition } from "../domain/pathProgress";
import { xpForAnswer } from "../domain/xp";
import { rootThemesForLesson } from "../domain/themeTree";
import { buildRemixPool, computeMasteryScore, selectRemixLessons, REMIX_MAX_LESSONS } from "../domain/deepDiveRemix";
import { loadCardStates } from "../lib/cardStateStore";
import { ExerciseSessionScreen } from "../components/lesson/ExerciseSessionScreen";
import { RealLessonOverlay } from "../components/tutorial/RealLessonOverlay";
import { LessonResults } from "../components/lesson/LessonResults";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Button } from "../components/common/Button";
import type { ThemeLessonRef } from "../types/content";
import styles from "./LessonPage.module.css";

/**
 * A planned lesson from the learner's own cursor (API_SPEC.md §2.2). The
 * in-session screen itself is components/lesson/ExerciseSessionScreen.tsx,
 * shared with StoryPage and PracticePage; what's here is what's specific to a
 * real, graded lesson — the nothing-due offer, the XP burst, the first-lesson
 * tutorial spotlight, and the scored recap.
 */
export function LessonPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lessonKey } = useParams();
  const [searchParams] = useSearchParams();
  const isRemixRoute = location.pathname.startsWith("/lesson/deep-dive-remix/") && lessonKey != null;
  // The lesson-LESS remix: /lesson/deep-dive-remix?themeIds=a,b (from
  // ThemeRemixPage's picker) — no source lesson, so no exclusion and no
  // source-anchored mastery; just the picked tags' pooled lessons. Counts as
  // a deep dive for every copy/tutorial decision below, same as the others.
  const isThemeRemixRoute = location.pathname.replace(/\/$/, "") === "/lesson/deep-dive-remix" && lessonKey == null;
  const isDeepDive = lessonKey != null || isThemeRemixRoute;
  const themeIdsParam = isThemeRemixRoute ? (searchParams.get("themeIds") ?? "") : "";
  const remixThemeIds = useMemo(() => themeIdsParam.split(",").filter((id) => id !== ""), [themeIdsParam]);

  const bootstrap = useBootstrap();
  const course = bootstrap.data?.course ?? null;
  const { userId } = useAuth();
  // Fetched independently of the engine (course comes straight from
  // bootstrap, not engine.course) because the remix route needs it BEFORE
  // useLessonEngine can even be called — its key list is an input, not an
  // output, of this computation.
  const themeIndex = useThemeIndex(course);

  // Every theme-tagged lesson's artifact, course-wide — shared with
  // ThemesPage's counts and ThemeBrowsePage's rows (useAllThemeSkillArtifacts'
  // own doc comment), so this costs nothing extra once either of those pages
  // has been visited this session, and gives the remix pool below the same
  // category data those pages already filter on.
  const { skills: allThemeSkillArtifacts, isLoading: themeSkillsLoading } = useAllThemeSkillArtifacts(
    isRemixRoute || isThemeRemixRoute ? course : null,
    themeIndex.data,
  );
  const sourceArtifact = lessonKey ? allThemeSkillArtifacts.get(refKey({ unitKey: null, skillKey: lessonKey })) : undefined;

  // The remix route's own lesson key list: every OTHER standard-category
  // lesson across every theme the source lesson belongs to, weighted by how
  // well the learner already knows the source lesson's vocabulary
  // (domain/deepDiveRemix.ts). Story/conversation/song lessons are excluded
  // here for the same reason ThemeBrowsePage excludes them from browsing —
  // they only make sense played in sequence, not remixed into an arbitrary
  // practice session — which also compensates for themes.json currently
  // leaking them in (a known backend gap, not fixed here). Falls back to
  // just the source lesson alone when its themes have nothing else to offer,
  // rather than a dead end. Deliberately returns [] (not [lessonKey]) while
  // its own prerequisite fetches (theme index, every candidate's artifact)
  // are still in flight — useLessonEngine treats an empty deep-dive key
  // array as "still loading", not "nothing to show" (see its own doc
  // comment), so this naturally keeps LessonPage in the loading state until
  // there's something real to hand it.
  //
  // Unions across the lesson's ROOT tags only: `lessons` is rolled up the
  // theme tree, so every descendant tag's lessons are already inside its
  // root — root-union equals all-depth-union, just without re-walking every
  // ancestor bucket.
  const remixPool = useMemo<ThemeLessonRef[]>(() => {
    if (!isRemixRoute || !lessonKey || sourceArtifact == null) return [];
    return buildRemixPool(themeIndex.data, allThemeSkillArtifacts, {
      themeIds: rootThemesForLesson(themeIndex.data, lessonKey).map((t) => t.id),
      excludeLessonKey: lessonKey, // "more like this", not "this again"
    });
  }, [isRemixRoute, lessonKey, themeIndex.data, allThemeSkillArtifacts, sourceArtifact]);

  const remixKeys = useMemo<string[]>(() => {
    if (!isRemixRoute || !lessonKey || themeIndex.data == null || sourceArtifact == null) return [];
    if (remixPool.length === 0) return [lessonKey];
    const cardStates = userId ? loadCardStates(userId) : {};
    const tags = [...new Set(sourceArtifact.exercises.flatMap((e) => e.tags))];
    const mastery = computeMasteryScore(cardStates, tags);
    return selectRemixLessons(remixPool, mastery, REMIX_MAX_LESSONS).map((l) => l.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectRemixLessons is intentionally randomized (weighted sampling); recomputing only when its real inputs' identities change, not every render, is the point — same posture as ThemeBrowsePage's shuffle-on-toggle.
  }, [isRemixRoute, lessonKey, themeIndex.data, sourceArtifact, remixPool, userId]);

  // The lesson-less remix's pool + key list. Waits (returns []) until the
  // theme index AND every candidate artifact have resolved — the same
  // "empty array = still loading" contract as above — but unlike the
  // lesson-anchored route there's no source lesson to fall back to, so a
  // genuinely empty pool is surfaced as its own screen (themeRemixIsEmpty)
  // instead of leaving useLessonEngine waiting forever. Mastery is a neutral
  // 0.5: there's no single source lesson's vocabulary to score against, and
  // aggregating mastery across an arbitrary multi-tag pool is out of scope.
  const themeRemixReady = isThemeRemixRoute && themeIndex.data != null && !themeSkillsLoading;
  const themeRemixPool = useMemo<ThemeLessonRef[]>(() => {
    if (!themeRemixReady) return [];
    return buildRemixPool(themeIndex.data, allThemeSkillArtifacts, { themeIds: remixThemeIds });
  }, [themeRemixReady, themeIndex.data, allThemeSkillArtifacts, remixThemeIds]);
  const themeRemixKeys = useMemo<string[]>(
    () => selectRemixLessons(themeRemixPool, 0.5, REMIX_MAX_LESSONS).map((l) => l.id),
    // Randomized on purpose (weighted sampling) — recompute only when the pool itself changes, same as remixKeys above.
    [themeRemixPool],
  );
  const themeRemixIsEmpty = themeRemixReady && themeRemixPool.length === 0;

  const engine = useLessonEngine(
    isThemeRemixRoute ? themeRemixKeys : isRemixRoute ? remixKeys : isDeepDive && lessonKey ? [lessonKey] : undefined,
  );
  const session = useExerciseSession<LessonExerciseInstance, SubmitAnswerResult>(engine.course);
  const { confirmation } = session;
  const [lastUsedHint, setLastUsedHint] = useState(false);
  const [forceShowTutorial, setForceShowTutorial] = useState(false);

  // The real-lesson walkthrough is only allowed to auto-trigger on the
  // course's very first standard position — see RealLessonOverlay's
  // allowAutoTrigger doc. bootstrap/useCoursePath are already cached by
  // react-query (every other screen reads the same queries), so this costs
  // no extra network round-trip. Never applies to a deep dive — it's never
  // the learner's first lesson.
  const { path } = useCoursePath(course, bootstrap.data?.position ?? null);
  const allowTutorialAutoTrigger =
    !isDeepDive &&
    !!engine.current &&
    engine.current.unitKey != null &&
    path.length > 0 &&
    isFirstStandardPosition(path, { unitKey: engine.current.unitKey, skillKey: engine.current.skillKey });

  // For the "Deep Dive" bridge on the recap below — both the ordinary
  // cursor-driven recap and the deep-dive recap can offer it, so it's
  // resolved unconditionally rather than only in deep-dive mode. Reuses the
  // same themeIndex fetched above for the remix computation.
  const primarySkillRef = engine.sessionSkillRefs[0] ?? null;
  // Root tags only: rollup lists a lesson in every ancestor of its tag, so
  // the all-depth set would show e.g. Grammar AND Tenses AND PastTense chips
  // for one PastTense lesson. Deeper tags stay reachable from the Journey's
  // Deep Dive chooser and from each root's browse page.
  const lessonThemes = primarySkillRef ? rootThemesForLesson(themeIndex.data, primarySkillRef.skillKey) : [];
  // Hides the bridge for a non-standard category (story/conversation/song) —
  // those never belong in a themes.json browse bucket even when tagged
  // (content/CLAUDE.md), and this also happens to compensate for a known
  // backend gap where the publisher doesn't yet filter them out itself.
  const showDeepDiveBridge = lessonThemes.length > 0 && engine.sessionSkillCategory === "standard";

  // Restart the engine's latency clock exactly when an exercise becomes
  // visible — i.e. once the previous answer's feedback has been dismissed
  // (by the Continue button OR the hook's own Enter handling), not when that
  // answer was submitted. Otherwise feedback-reading time is billed to the
  // next exercise's latencyMs, which the server grades on.
  const { markShown } = engine;
  const isReviewing = confirmation.answeredItem !== null;
  useEffect(() => {
    if (!isReviewing) markShown();
  }, [isReviewing, markShown]);

  if (isThemeRemixRoute && themeIndex.isError) {
    return <ErrorBanner message="Couldn't load themes from the CDN." />;
  }

  if (themeRemixIsEmpty) {
    return (
      <div className={styles.done}>
        <h1>Nothing to remix here yet</h1>
        <p>The topics you picked don't have any practice lessons in your current course version.</p>
        <div className={styles.doneActions}>
          <Button onClick={() => navigate("/theme-remix")}>Pick other topics</Button>
        </div>
      </div>
    );
  }

  if (engine.status === "loading") {
    return <Spinner label="Preparing your lesson…" />;
  }

  if (engine.status === "error") {
    return <ErrorBanner message="Couldn't load your next lesson." />;
  }

  // A deep-dive lesson key that names no lesson in the caller's pinned
  // course version — GET /v1/sessions/for-lesson's 404 (API_SPEC.md §2.11),
  // the same "unavailable, try updating" case a stale version mismatch gets
  // anywhere else in this app.
  if (engine.status === "unavailable") {
    return (
      <div className={styles.done}>
        <h1>This lesson isn't available</h1>
        <p>It isn't in your current course version — try updating your course, or pick another lesson to try.</p>
        <div className={styles.doneActions}>
          <Button onClick={() => navigate("/themes")}>Back to browsing</Button>
        </div>
      </div>
    );
  }

  if (engine.status === "empty") {
    return (
      <div className={styles.done}>
        <h1>{isDeepDive ? "Nothing new to practice here right now" : "Nothing due right now"}</h1>
        <p>
          Nothing's scheduled for review, but that doesn't mean you can't go through it again — practice rounds just
          don't count toward your review schedule.
        </p>
        <div className={styles.doneActions}>
          <Button variant="secondary" onClick={() => navigate(isDeepDive ? "/themes" : "/path")}>
            {isDeepDive ? "Back to browsing" : "Back to path"}
          </Button>
          <Button onClick={engine.startPractice}>Practice anyway</Button>
        </div>
      </div>
    );
  }

  // An unconfirmed answer outranks BOTH of these: submitAnswer() already
  // kicked off the session submission the instant the last exercise was
  // answered, but the learner still needs to confirm it before landing on the
  // results screen — the engine finishing in the background doesn't get to
  // skip that. ExerciseSessionScreen keeps showing that review until then.
  if (!(confirmation.answeredItem && confirmation.feedback)) {
    if (engine.status === "submitting") {
      return <Spinner label="Saving your progress…" />;
    }

    // The server answered, but refused the session(s) — see useLessonEngine's
    // rejection handling. Showing the completion recap here would tell the
    // learner their progress was saved when it wasn't.
    if (engine.status === "rejected") {
      const partial = engine.rejection !== null && engine.rejection.rejected < engine.rejection.total;
      return (
        <div className={styles.done}>
          <h1>{partial ? "Only part of this lesson was saved" : "This lesson wasn't saved"}</h1>
          <p>
            {engine.rejection?.reason ??
              "The server didn't record this session, so it won't count toward your review schedule."}
          </p>
          <LessonResults correct={engine.score.correct} total={engine.score.total} />
          <div className={styles.doneActions}>
            <Button onClick={() => navigate("/path")}>Back to path</Button>
          </div>
        </div>
      );
    }

    if (engine.status === "done") {
      return (
        <div className={styles.done}>
          <h1>Lesson complete!</h1>
          {engine.isPracticeMode && <p className={styles.practiceNote}>Practice round — doesn't count toward your review schedule.</p>}
          {engine.result && engine.result.outcome === "AlreadyProcessed" && <p>Already recorded.</p>}
          {engine.journeyAdvanced && <p className={styles.practiceNote}>This also moved you forward in your Journey.</p>}
          <LessonResults correct={engine.score.correct} total={engine.score.total} />
          <div className={styles.doneActions}>
            <Button onClick={() => navigate("/path")}>Back to path</Button>
            <Button variant="secondary" onClick={engine.startPractice}>
              Practice again
            </Button>
          </div>
          {showDeepDiveBridge && primarySkillRef && (
            <div className={styles.doneActions}>
              {lessonThemes.length === 1 ? (
                <Button
                  variant="secondary"
                  onClick={() =>
                    navigate(`/themes/${encodeURIComponent(lessonThemes[0].id)}?from=${encodeURIComponent(primarySkillRef.skillKey)}`)
                  }
                >
                  Deep Dive
                </Button>
              ) : (
                <div className={styles.themeChips}>
                  <span>Deep Dive:</span>
                  {lessonThemes.map((theme) => (
                    <Button
                      key={theme.id}
                      variant="secondary"
                      onClick={() =>
                        navigate(`/themes/${encodeURIComponent(theme.id)}?from=${encodeURIComponent(primarySkillRef.skillKey)}`)
                      }
                    >
                      {theme.id}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
  }

  async function handleSubmit(text: string, opts?: { usedHint?: boolean }) {
    const answered = engine.current; // snapshot before submitAnswer advances the queue
    if (!answered) return;
    const result = await engine.submitAnswer(text, opts);
    setLastUsedHint(opts?.usedHint ?? false);
    confirmation.record(answered, result);
  }

  return (
    <ExerciseSessionScreen
      session={session}
      courseCode={engine.courseCode}
      progress={engine.progress}
      current={engine.current}
      onSubmit={handleSubmit}
      feedbackXp={(feedback) => xpForAnswer(feedback.verdict, feedback.attempt, lastUsedHint)}
      overlay={({ item, topRowEl, exerciseEl }) => (
        <RealLessonOverlay
          topRowEl={topRowEl}
          exerciseEl={exerciseEl}
          renderType={item.renderType}
          allowAutoTrigger={allowTutorialAutoTrigger}
          forceShow={forceShowTutorial}
          onForceShowHandled={() => setForceShowTutorial(false)}
        />
      )}
      onReplayTutorial={() => setForceShowTutorial(true)}
    />
  );
}
