import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useBootstrap } from "../hooks/useBootstrap";
import { useLexemeIndex, useCourseVocabulary } from "../hooks/useCourseContent";
import { useStarredLexemes } from "../hooks/useStarredLexemes";
import { lessonVocab, unitVocabTags, courseVocabTags } from "../domain/courseVocabulary";
import { KeyboardModeToggle } from "../components/lesson/keyboard/KeyboardModeToggle";
import { VocabTermCard } from "../components/vocabulary/VocabTermCard";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Button } from "../components/common/Button";
import styles from "./VocabularyReviewPage.module.css";

type Scope = "lesson" | "unit" | "course";

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

  const [scope, setScope] = useState<Scope>(skillKey ? "lesson" : unitKey ? "unit" : "course");

  if (bootstrap.isLoading || lexemeIndex.isLoading || vocabulary.isLoading) return <Spinner label="Loading vocabulary…" />;
  if (bootstrap.isError || lexemeIndex.isError || vocabulary.isError) {
    return <ErrorBanner message="Couldn't load vocabulary from the CDN." />;
  }

  const lesson = unitKey && skillKey ? lessonVocab(vocabulary.units, unitKey, skillKey) : null;

  const tags: string[] =
    scope === "lesson" && lesson
      ? lesson.tags
      : scope === "unit" && unitKey
        ? unitVocabTags(vocabulary.units, unitKey)
        : courseVocabTags(vocabulary.units);

  const entries = tags
    .map((tag) => ({ tag, entry: lexemeIndex.data?.[tag] }))
    .filter((e): e is { tag: string; entry: NonNullable<typeof e.entry> } => e.entry != null);

  const unitTitle = vocabulary.units.find((u) => u.unitKey === unitKey)?.title;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>Vocabulary</h1>
        <Button variant="secondary" onClick={() => navigate("/path")}>
          Back to path
        </Button>
      </div>

      <KeyboardModeToggle
        options={[
          ...(lesson ? [{ value: "lesson" as const, label: lesson.title }] : []),
          ...(unitTitle ? [{ value: "unit" as const, label: unitTitle }] : []),
          { value: "course" as const, label: "Whole course" },
        ]}
        value={scope}
        onChange={setScope}
      />

      {entries.length === 0 ? (
        <p>Nothing here yet.</p>
      ) : (
        <div className={styles.list}>
          {entries.map(({ tag, entry }) => (
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
