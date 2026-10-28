import { useParams } from "react-router-dom";
import { useBootstrap } from "../hooks/useBootstrap";
import { glossaryForCourse, findGlossaryEntry } from "../domain/glossaryContent";
import { BackButton } from "../components/common/BackButton";
import { GlossaryEntryView } from "../components/glossary/GlossaryEntryView";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { errorMessage } from "../lib/errors";

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

  const courseCode = bootstrap.data?.course?.code;

  return (
    <div>
      <BackButton />
      <GlossaryEntryView entry={entry} courseCode={courseCode} />
    </div>
  );
}
