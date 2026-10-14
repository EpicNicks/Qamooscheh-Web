import { useEffect } from "react";
import { contentCacheName, pinContentCache, pruneContentCaches } from "../lib/contentCache";
import type { CourseRef } from "../types/api";

/** Keeps the course version's cached content from being pruned while the calling lesson is open. */
export function useHoldContentCache(course: CourseRef | null | undefined): void {
  const code = course?.code;
  const version = course?.version;
  useEffect(() => {
    if (code === undefined || version === undefined) return;
    return pinContentCache(contentCacheName(code, version));
  }, [code, version]);
}

/** Prunes the caches of superseded course versions once the live one is known (startup), sparing any a lesson holds. */
export function usePruneContentCaches(live: CourseRef | null | undefined): void {
  const code = live?.code;
  const version = live?.version;
  useEffect(() => {
    if (code === undefined || version === undefined) return;
    void pruneContentCaches([contentCacheName(code, version)]);
  }, [code, version]);
}
