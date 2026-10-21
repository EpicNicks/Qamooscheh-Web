// The server's rejection reason tokens (SessionSubmitExceptions.cs, API_SPEC.md §2.3)
// as copy a learner can read. An unknown token answers null so callers fall back
// to generic wording instead of showing a raw identifier.
const REASONS: Record<string, string> = {
  unresolvable_course_version: "That version of the course is no longer available.",
  unknown_course: "You're no longer enrolled in that course.",
  unknown_skill: "That Parsle has changed since you took it.",
  unknown_exercise: "That Parsle has changed since you took it.",
  unknown_lexeme_tag: "That Parsle has changed since you took it.",
  nothing_to_grade: "It had no answers to save.",
  write_failed: "The server couldn't save it.",
};

export function describeRejectionReason(token: string | null | undefined): string | null {
  return token ? (REASONS[token] ?? null) : null;
}
