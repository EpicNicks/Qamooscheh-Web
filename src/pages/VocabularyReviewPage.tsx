import { useNavigate } from "react-router-dom";
import { useBootstrap } from "../hooks/useBootstrap";
import { useLexemeIndex } from "../hooks/useCourseContent";
import { useStarredLexemes } from "../hooks/useStarredLexemes";
import { VocabTermCard } from "../components/vocabulary/VocabTermCard";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Button } from "../components/common/Button";
import styles from "./VocabularyReviewPage.module.css";

/**
 * Every lexeme in the course's current version, browsable ahead of the
 * lessons that actually teach them — one fetch (the flat lexemes.json the
 * course's manifest already points to), not one fetch per skill, since the
 * index is exactly this shape already (see hooks/useCourseContent.ts's
 * useLexemeIndex). Starring is local-only for now — see
 * hooks/useStarredLexemes.ts's header for why.
 */
export function VocabularyReviewPage() {
  const navigate = useNavigate();
  const bootstrap = useBootstrap();
  const course = bootstrap.data?.course ?? null;
  const lexemeIndex = useLexemeIndex(course);
  const starred = useStarredLexemes(course?.code);

  if (bootstrap.isLoading || lexemeIndex.isLoading) return <Spinner label="Loading vocabulary…" />;
  if (bootstrap.isError || lexemeIndex.isError) return <ErrorBanner message="Couldn't load vocabulary from the CDN." />;

  const entries = Object.entries(lexemeIndex.data ?? {});

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>Vocabulary</h1>
        <Button variant="secondary" onClick={() => navigate("/path")}>
          Back to path
        </Button>
      </div>
      {entries.length === 0 ? (
        <p>Nothing here yet.</p>
      ) : (
        <div className={styles.list}>
          {entries.map(([tag, entry]) => (
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
