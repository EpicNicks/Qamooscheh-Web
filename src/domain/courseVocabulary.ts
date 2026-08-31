// Vocabulary grouped by lesson and by unit — derived entirely from content
// already on the CDN (SkillArtifact.exercises[].tags), never from a second
// backend concept. lexemes.json itself carries no unit/skill association at
// all (it's a flat tag -> gloss map), so "vocabulary for this lesson/unit"
// can only ever come from walking which tags each skill's exercises
// actually use — this module is that walk, done once and shared by every
// scope the vocab screen offers.
//
// Lesson vocab is the single source of truth: unit vocab is the deduped
// union of its lessons' tags (in lesson order), and course vocab is the
// deduped union of every unit's tags (in unit order) — two pure derivations
// over the same list, not three independently-fetched things that could
// drift from each other.

export interface LessonVocab {
  unitKey: string;
  skillKey: string;
  title: string;
  /** This skill's own exercises' tags, deduped, first-occurrence order. */
  tags: string[];
}

export interface UnitVocab {
  unitKey: string;
  title: string;
  lessons: LessonVocab[];
}

function dedupe(tags: Iterable<string>): string[] {
  return [...new Set(tags)];
}

/** This lesson's own vocabulary — a plain lookup, kept as a function (rather than inlined at every call site) so "how do I find one lesson's list" has one answer. */
export function lessonVocab(units: UnitVocab[], unitKey: string, skillKey: string): LessonVocab | null {
  return units.find((u) => u.unitKey === unitKey)?.lessons.find((l) => l.skillKey === skillKey) ?? null;
}

/** Every tag any lesson in this unit uses, deduped, in the order those lessons are authored. */
export function unitVocabTags(units: UnitVocab[], unitKey: string): string[] {
  const unit = units.find((u) => u.unitKey === unitKey);
  return unit ? dedupe(unit.lessons.flatMap((l) => l.tags)) : [];
}

/** Every tag anywhere in the course, deduped, in unit-then-lesson order. */
export function courseVocabTags(units: UnitVocab[]): string[] {
  return dedupe(units.flatMap((u) => u.lessons.flatMap((l) => l.tags)));
}
