import { useBootstrap } from "../hooks/useBootstrap";
import { useCoursePath } from "../hooks/useCourseContent";
import { UnitSection } from "../components/path/UnitSection";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { errorMessage } from "../lib/errors";

export function PathPage() {
  const bootstrap = useBootstrap();
  const { path, isLoading, isError } = useCoursePath(bootstrap.data?.course ?? null, bootstrap.data?.position ?? null);

  if (bootstrap.isLoading || isLoading) return <Spinner label="Loading your course…" />;
  if (bootstrap.isError) return <ErrorBanner message={errorMessage(bootstrap.error, "Couldn't load your course.")} />;
  if (isError) return <ErrorBanner message="Couldn't load course content from the CDN." />;

  return (
    <div>
      {path.map((unit) => (
        <UnitSection key={unit.unitKey} unit={unit} />
      ))}
    </div>
  );
}
