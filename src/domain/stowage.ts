// The Stowage (API_SPEC.md §2.18): the lessons a learner failed and deferred.
// The server owns the state machine and the reminder maths; these helpers only
// read the shape it sends, so a client never infers stowed state from the cursor.
import type { StowageUnit } from "../types/api";

/** `unitKey/lessonKey` for every lesson in the Stowage — the form pathProgress joins on. */
export function stowedRefs(stowage: readonly StowageUnit[] | undefined): Set<string> {
  const refs = new Set<string>();
  for (const unit of stowage ?? []) {
    for (const lesson of unit.lessons) refs.add(stowedRef(unit.unitKey, lesson.lessonKey));
  }
  return refs;
}

export function stowedRef(unitKey: string, lessonKey: string): string {
  return `${unitKey}/${lessonKey}`;
}

/** Whether the reminder modal has something to say: any lesson ready for another try. The server never reports a muted lesson as due. */
export function hasReadyPrompt(stowage: readonly StowageUnit[] | undefined): boolean {
  return (stowage ?? []).some((unit) => unit.lessons.some((lesson) => lesson.readyPromptDue));
}

/** The Stowage without `lessonKey`, dropping a unit left empty — what a pass that cleared it leaves behind. */
export function withoutStowedLesson(stowage: readonly StowageUnit[], lessonKey: string): StowageUnit[] {
  return stowage
    .map((unit) => ({ ...unit, lessons: unit.lessons.filter((lesson) => lesson.lessonKey !== lessonKey) }))
    .filter((unit) => unit.lessons.length > 0);
}

/** What the learner is told when the server refuses a stow (API_SPEC.md §2.18's 409/404 reasons). */
export function stowRefusalMessage(reason: string | null | undefined): string {
  switch (reason) {
    case "no_failed_attempt":
      return "That Parsle can't be stowed right now. Finish an attempt first.";
    case "already_cleared":
      return "You've already passed that Parsle.";
    case "already_dropped":
      return "That Parsle is no longer in this course.";
    case "not_current_position":
    case "unknown_lesson":
      return "That Parsle can't be stowed any more. Your path has been refreshed.";
    default:
      return "Couldn't stow that Parsle. Check your connection and try again.";
  }
}
