import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useBootstrap } from "../hooks/useBootstrap";
import { useLexemeIndex, useCourseVocabulary } from "../hooks/useCourseContent";
import { useStarredLexemes } from "../hooks/useStarredLexemes";
import { matchesVocabQuery } from "../domain/vocabSearch";
import { lessonVocab, unitVocabTags, courseVocabTags } from "../domain/courseVocabulary";
import { SegmentedToggle } from "../components/common/SegmentedToggle";
import { VocabTermCard } from "../components/vocabulary/VocabTermCard";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Button } from "../components/common/Button";
import styles from "./VocabularyReviewPage.module.css";

type Scope = "lesson" | "unit" | "course" | "saved";

/**
 * Vocabulary at whichever scope the learner asks for — a single lesson, its
 * unit, or the whole course — all three derived from the SAME per-lesson
 * tag lists (domain/courseVocabulary.ts), never fetched or computed
 * separately, so unit/course vocabulary can't drift from what its lessons
 * actually contain. lexemes.json (useLexemeIndex) still supplies the
 * gloss/romanization for each tag; useCourseVocabulary only supplies which
 * tags belong to which lesson/unit, since the CDN's flat lexeme index
 * carries no such association at all.
 */
export function VocabularyReviewPage() {
  const { unitKey, skillKey } = useParams();
  const navigate = useNavigate();
  const bootstrap = useBootstrap();
  const course = bootstrap.data?.course ?? null;
  const lexemeIndex = useLexemeIndex(course);
  const vocabulary = useCourseVocabulary(course);
  const starred = useStarredLexemes(course?.code);

  // The scope a given route arrives at (see App.tsx's three /vocabulary
  // entries). It's only the STARTING point — the toggle below is free to move
  // off it — but all three routes render this same element, so React keeps
  // the component mounted when the learner navigates from one to another and
  // the initial value has to be re-applied by hand when that happens.
  const routeScope: Scope = skillKey ? "lesson" : unitKey ? "unit" : "course";
  const routeKey = `${unitKey ?? ""}/${skillKey ?? ""}`;
  const [scope, setScope] = useState<Scope>(routeScope);
  const [query, setQuery] = useState("");
  // A plain state adjustment during render (this render's output is
  // discarded; React immediately re-renders with the new scope) rather than a
  // useEffect — the same pattern ProfilePage/SettingsPage use for their own
  // re-seeding, and there's no external system to synchronize with here.
  const [seededFor, setSeededFor] = useState(routeKey);
  if (seededFor !== routeKey) {
    setSeededFor(routeKey);
    setScope(routeScope);
  }

  if (bootstrap.isLoading || lexemeIndex.isLoading || vocabulary.isLoading) return <Spinner label="Loading vocabulary…" />;
  if (bootstrap.isError || lexemeIndex.isError || vocabulary.isError) {
    return <ErrorBanner message="Couldn't load vocabulary from the CDN." />;
  }

  const lesson = unitKey && skillKey ? lessonVocab(vocabulary.units, unitKey, skillKey) : null;

  const tags: string[] =
    scope === "saved"
      ? [...starred.tags]
      : scope === "lesson" && lesson
        ? lesson.tags
        : scope === "unit" && unitKey
          ? unitVocabTags(vocabulary.units, unitKey)
          : courseVocabTags(vocabulary.units);
  // Saved words of THIS course — the saved list spans every course.
  const savedHere = starred.tags.filter((tag) => lexemeIndex.data?.[tag] != null).length;

  const entries = tags
    .map((tag) => ({ tag, entry: lexemeIndex.data?.[tag] }))
    .filter((e): e is { tag: string; entry: NonNullable<typeof e.entry> } => e.entry != null);
  const searching = query.trim() !== "";
  const shown = searching ? entries.filter((e) => matchesVocabQuery(e.tag, e.entry, query)) : entries;

  const unitTitle = vocabulary.units.find((u) => u.unitKey === unitKey)?.title;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>Vocabulary</h1>
        <Button variant="secondary" onClick={() => navigate("/path")}>
          Back to path
        </Button>
      </div>

      <SegmentedToggle
        options={[
          ...(lesson ? [{ value: "lesson" as const, label: lesson.title }] : []),
          ...(unitTitle ? [{ value: "unit" as const, label: unitTitle }] : []),
          { value: "course" as const, label: "Whole course" },
          { value: "saved" as const, label: "Saved" },
        ]}
        value={scope}
        onChange={setScope}
      />

      <div className={styles.search}>
        <input
          type="search"
          className={styles.searchInput}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search words, meanings, romanization…"
          aria-label="Search vocabulary"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        {searching && (
          <span className={styles.savedCount} role="status">
            {shown.length} of {entries.length}
          </span>
        )}
      </div>

      <div className={styles.savedBar}>
        <span className={styles.savedCount}>
          {savedHere} saved here
          {starred.limit != null && ` · ${starred.tags.length} / ${starred.limit} on your plan`}
        </span>
        <div className={styles.savedActions}>
          <Button variant="secondary" disabled={savedHere === 0} onClick={() => navigate("/flashcards")}>
            Flashcards
          </Button>
          <Button disabled={savedHere === 0} onClick={() => navigate("/saved-practice")}>
            Practise saved words
          </Button>
        </div>
      </div>
      {starred.limitMessage && <ErrorBanner message={starred.limitMessage} />}

      {shown.length === 0 ? (
        <p>
          {searching
            ? `No words match “${query.trim()}”.`
            : scope === "saved"
              ? "No saved words yet. Tap ★ on a word to save it."
              : "Nothing here yet."}
        </p>
      ) : (
        <div className={styles.list}>
          {shown.map(({ tag, entry }) => (
            <VocabTermCard
              key={tag}
              tag={tag}
              entry={entry}
              courseCode={course?.code}
              starred={starred.isStarred(tag)}
              onToggleStar={() => starred.toggle(tag)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
