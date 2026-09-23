import type { SkillRef } from "../types/api";

/** `${unitKey}/${skillKey}`, null-safe — the shared key convention for skill-artifact maps, since a theme lesson's `unitKey` can be null. Lives in domain/ (re-exported from hooks/useCourseContent.ts) so pure domain helpers can key into those maps without importing a React hooks module. */
export function refKey(ref: SkillRef): string {
  return `${ref.unitKey ?? "_"}/${ref.skillKey}`;
}
