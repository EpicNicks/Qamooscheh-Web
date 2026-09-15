import { useParams } from "react-router-dom";
import { useBootstrap } from "../hooks/useBootstrap";
import { glossaryForCourse, findGlossaryEntry } from "../domain/glossaryContent";
import { BackButton } from "../components/common/BackButton";
import { DirectionalText } from "../components/common/DirectionalText";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { errorMessage } from "../lib/errors";
import styles from "./GlossaryEntryPage.module.css";

/** One leaf glossary entry's term list, reached from GlossaryTree — a real route (not a modal/expansion) so it lands in browser history and the back button/browser back agree with each other. */
export function GlossaryEntryPage() {
  const { "*": wildcard = "" } = useParams();
  const bootstrap = useBootstrap();
  const path = wildcard.split("/").filter(Boolean);

  if (bootstrap.isLoading) return <Spinner label="Loading…" />;
  if (bootstrap.isError) return <ErrorBanner message={errorMessage(bootstrap.error, "Couldn't load your course.")} />;

  const entries = glossaryForCourse(bootstrap.data?.course?.code);
  const entry = findGlossaryEntry(entries, path);

  if (!entry || entry.children?.length) {
    return (
      <div>
        <BackButton />
        <ErrorBanner message="This glossary entry doesn't exist." />
      </div>
    );
  }

  return (
    <div>
      <BackButton />
      <h1 className={styles.title}>{entry.title}</h1>
      {entry.note && <p className={styles.note}>{entry.note}</p>}
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Term</th>
              <th>Romanization</th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            {(entry.terms ?? []).map((term) => (
              <tr key={term.term}>
                <td>
                  <DirectionalText courseCode={bootstrap.data?.course?.code} className={styles.native}>
                    {term.term}
                  </DirectionalText>
                </td>
                <td className={styles.romanization}>{term.romanization}</td>
                <td className={styles.definition}>{term.definition}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
