import type { VerbIndexEntry } from "../types/content";
import { useBootstrap } from "./useBootstrap";
import { useVerbIndex } from "./useCourseContent";

/**
 * The current course's verb index entry for an infinitive, or null while it
 * loads, when there is none, or when `lemma` is null. Fetches nothing for a
 * null `lemma`, so a word that isn't a verb costs nothing.
 */
export function useVerbEntry(lemma: string | undefined): VerbIndexEntry | null {
  const wanted = lemma != null;
  const course = useBootstrap({ enabled: wanted }).data?.course ?? null;
  const index = useVerbIndex(course, wanted).data;
  return (wanted && index?.[lemma]) || null;
}
