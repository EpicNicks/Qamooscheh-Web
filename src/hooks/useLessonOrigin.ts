import { useSearchParams } from "react-router-dom";
import { resolveLessonOrigin, type LessonOrigin } from "../domain/lessonOrigin";

/** The current lesson/practice/story URL's `?from=` origin (see domain/lessonOrigin.ts), defaulting to the Journey. */
export function useLessonOrigin(): LessonOrigin & { raw: string | null } {
  const [searchParams] = useSearchParams();
  const raw = searchParams.get("from");
  return { ...resolveLessonOrigin(raw), raw };
}
