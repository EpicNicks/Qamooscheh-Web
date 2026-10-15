import { useId, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useBootstrap } from "../hooks/useBootstrap";
import { useAllThemeSkillArtifacts, useThemeIndex } from "../hooks/useCourseContent";
import { useRepackSequence } from "../hooks/useRepackSequence";
import {
  MAX_BOX_PARSLES,
  addToBox,
  buildCandidates,
  comboboxKeyAction,
  removeFromBox,
  repackStartUrl,
  searchCandidates,
  type RepackCandidate,
} from "../domain/repackBuilder";
import { runDropSequence, runGoSequence } from "../domain/repackSequence";
import { REPACK_ANIMATIONS } from "../components/repack/repackAnimations";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Button } from "../components/common/Button";
import { errorMessage } from "../lib/errors";
import styles from "./RepackBuilderPage.module.css";

/**
 * Sidebar Deep Dives -> Build a Repack: search single Parsles, drop them into
 * the box, and GO! starts the existing lesson-less remix route
 * (`/lesson/deep-dive-remix?lessonIds=...`) with exactly those Parsles. The
 * animations are placeholders from the registry; the chosen list below the box
 * carries the same information for screen readers and reduced-motion users.
 */
export function RepackBuilderPage() {
  const navigate = useNavigate();
  const bootstrap = useBootstrap();
  const course = bootstrap.data?.course ?? null;
  const themeIndex = useThemeIndex(course);
  const { skills, isLoading: skillsLoading, isError: skillsError } = useAllThemeSkillArtifacts(course, themeIndex.data);
  const { active, play, complete } = useRepackSequence();

  const [box, setBox] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const [announcement, setAnnouncement] = useState("");
  const [going, setGoing] = useState(false);
  const listboxId = useId();

  const candidates = useMemo(() => buildCandidates(themeIndex.data, skills), [themeIndex.data, skills]);
  const byId = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);
  const results = searchCandidates(candidates, query, box);
  const searching = query.trim() !== "";
  const listOpen = searching && results.length > 0;
  const activeIndex = listOpen ? Math.min(highlight, results.length - 1) : -1;
  const full = box.length >= MAX_BOX_PARSLES;

  if (bootstrap.isLoading || themeIndex.isLoading || skillsLoading) return <Spinner label="Loading Parsles…" />;
  if (bootstrap.isError) return <ErrorBanner message={errorMessage(bootstrap.error, "Couldn't load your course.")} />;
  if (themeIndex.isError) return <ErrorBanner message="Couldn't load Parsles from the CDN." />;
  if (candidates.length === 0) return <p>No Parsles to repack yet for this course.</p>;

  function titleOf(id: string): string {
    return byId.get(id)?.title ?? id;
  }

  function choose(candidate: RepackCandidate) {
    if (full || going) return;
    setBox((prev) => addToBox(prev, candidate.id));
    setAnnouncement(`${candidate.title} added to the box. ${box.length + 1} in the box.`);
    setQuery("");
    setHighlight(-1);
    void runDropSequence(play);
  }

  function remove(id: string) {
    if (going) return;
    setBox((prev) => removeFromBox(prev, id));
    setAnnouncement(`${titleOf(id)} removed from the box. ${box.length - 1} in the box.`);
  }

  function go() {
    if (box.length === 0 || going) return;
    setGoing(true);
    void runGoSequence(play, () => navigate(repackStartUrl(box)));
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    const action = comboboxKeyAction({ count: listOpen ? results.length : 0, active: activeIndex, query }, event.key);
    if (action.type === "none") return;
    event.preventDefault();
    if (action.type === "move") setHighlight(action.active);
    else if (action.type === "pick") choose(results[action.index]);
    else {
      setQuery("");
      setHighlight(-1);
    }
  }

  const animation = active ? REPACK_ANIMATIONS[active.name] : null;
  const boxClass = [styles.box, active?.name === "shake" ? styles.shaking : "", active?.name === "boxClose" || going ? styles.closing : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Build a Repack</h1>
        <Button variant="secondary" onClick={() => navigate("/themes")}>
          Back to Deep Dives
        </Button>
      </div>
      <p className={styles.intro}>Search for Parsles, drop them in the box, then press GO! to practice a blend of them.</p>
      {skillsError && <ErrorBanner message="Some Parsles couldn't be loaded." />}

      <div className={styles.search}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search by title, unit or topic…"
          value={query}
          disabled={going}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlight(0);
          }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-label="Search Parsles"
          aria-autocomplete="list"
          aria-expanded={listOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        />
        {listOpen && (
          <ul id={listboxId} role="listbox" aria-label="Matching Parsles" className={styles.suggestions}>
            {results.map((candidate, index) => (
              <li
                key={candidate.id}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={index === activeIndex ? `${styles.suggestion} ${styles.suggestionActive}` : styles.suggestion}
                // mousedown, not click: keeps focus in the input while picking.
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(candidate);
                }}
                onMouseEnter={() => setHighlight(index)}
              >
                <span className={styles.suggestionName}>{candidate.title}</span>
                <span className={styles.suggestionTrail}>
                  {[candidate.unitKey, ...candidate.themes].filter(Boolean).join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        )}
        {searching && !listOpen && (
          <p className={styles.noMatch} role="status">
            No Parsles match “{query.trim()}”.
          </p>
        )}
        {full && <p className={styles.noMatch}>The box is full ({MAX_BOX_PARSLES} Parsles). Remove one to add another.</p>}
      </div>

      <div className={styles.boxWrap}>
        <div className={boxClass} data-testid="repack-box">
          <span className={styles.boxCount} aria-hidden="true">
            {box.length}
          </span>
          {animation && active && <animation.Component key={active.id} durationMs={animation.durationMs} onComplete={complete} />}
        </div>
      </div>

      <section aria-labelledby={`${listboxId}-chosen`}>
        <h2 id={`${listboxId}-chosen`} className={styles.chosenTitle}>
          In the box ({box.length})
        </h2>
        {box.length === 0 ? (
          <p className={styles.empty}>Nothing in the box yet.</p>
        ) : (
          <ol className={styles.chosen}>
            {box.map((id) => (
              <li key={id} className={styles.chosenItem}>
                <span className={styles.chosenName}>{titleOf(id)}</span>
                <button type="button" className={styles.remove} onClick={() => remove(id)} disabled={going}>
                  <span aria-hidden="true">×</span>
                  <span className={styles.srOnly}>Remove {titleOf(id)}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className={styles.actions}>
        <Button variant="deepDive" onClick={go} disabled={box.length === 0 || going}>
          GO!
        </Button>
      </div>

      <div className={styles.srOnly} role="status" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}
