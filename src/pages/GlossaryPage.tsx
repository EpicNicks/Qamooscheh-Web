import { useBootstrap } from "../hooks/useBootstrap";
import { glossaryForCourse } from "../domain/glossaryContent";
import { GlossaryTree } from "../components/glossary/GlossaryTree";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { errorMessage } from "../lib/errors";
import styles from "./CourseSection.module.css";

/** Root of the current course's glossary — reached via the sidebar. Frontend-only content (domain/glossaryContent.ts), so there's no CDN/loading state for the tree itself, only for bootstrap's course code. */
export function GlossaryPage() {
  const bootstrap = useBootstrap();

  if (bootstrap.isLoading) return <Spinner label="Loading…" />;
  if (bootstrap.isError) return <ErrorBanner message={errorMessage(bootstrap.error, "Couldn't load your course.")} />;

  const entries = glossaryForCourse(bootstrap.data?.course?.code);

  return (
    <section className={styles.section}>
      {entries.length === 0 ? <p>Nothing here yet.</p> : <GlossaryTree entries={entries} />}
    </section>
  );
}
