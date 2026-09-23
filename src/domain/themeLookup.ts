import type { ThemeEntry, ThemeIndexArtifact } from "../types/content";

/** Every theme bucket (in themes.json) that lists this lesson key — a lesson typically has 1-3. */
export function themesForLesson(themeIndex: ThemeIndexArtifact | null | undefined, lessonKey: string): ThemeEntry[] {
  if (!themeIndex) return [];
  return themeIndex.themes.filter((theme) => theme.lessons.some((lesson) => lesson.id === lessonKey));
}
