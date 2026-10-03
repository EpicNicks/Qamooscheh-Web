// Types for the immutable, CDN-hosted content artifacts (Qamooscheh.Content's
// Artifacts/*.cs). Api never serves these bytes (API_SPEC.md §1) — the client
// fetches them straight from the artifact CDN using the pointers bootstrap
// hands back, and verifies only the root manifest.json against
// CourseRef.manifestSha256 (API_SPEC.md §2.1: child artifacts are reached by
// following the trusted manifest's own relative paths, not individually
// hash-verified).
import type { ExerciseScriptMode, ExerciseType, Register, SkillCategory } from "../domain/enums";

/** A pointer from a parent artifact to a child artifact's own JSON file. */
export interface ManifestRef {
  id: string;
  path: string;
}

/** course/{code}/v{version}/manifest.json */
export interface CourseManifest {
  courseCode: string;
  version: number;
  units: ManifestRef[];
  lexemeIndexPath: string;
  themeIndexPath: string;
  /** audio.json — the course's voices and recordings (AudioIndexArtifact). Missing on a manifest published before recordings were. */
  audioIndexPath?: string;
}

/**
 * One position in a unit's sequence. More than one `skills` entry means side
 * versions — alternate skills authored at the same point in the sequence,
 * where completing any one of them advances past it (the backend's
 * `UnitPosition`, mirroring `UnitSource.Skills`' own grouping; `skill.position`
 * has no UNIQUE constraint for exactly this reason).
 */
export interface UnitPosition {
  skills: ManifestRef[];
}

/**
 * units/{unitKey}.json
 *
 * `positions`, not a flat skill list: the publisher used to flatten side
 * versions away here, which discarded which skills shared a position. It
 * doesn't any more, because this client draws a branching path straight from
 * this artifact.
 */
export interface UnitArtifact {
  id: string;
  title: string;
  positions: UnitPosition[];
}

/** units/{unitKey}/skills/{skillKey}.json */
export interface SkillArtifact {
  id: string;
  title: string;
  category: SkillCategory;
  /**
   * The continuing narrative this skill is a chapter of (e.g. "ali-and-sara"),
   * or null when it isn't part of one. Free-form authored string. There is no
   * arc-position field — a chapter's place in its arc is the order it already
   * appears in, by unit and then by position within that unit.
   */
  arc: string | null;
  exercises: ExerciseArtifact[];
}

/**
 * The compiled form of one exercise. `tiles` is non-null/non-empty exactly
 * when the exercise is "composite" (API_SPEC.md §2.5) — carries both a
 * recall-gradable `answer` and a recognition-gradable tile set.
 */
export interface ExerciseArtifact {
  type: ExerciseType;
  scriptMode: ExerciseScriptMode;
  prompt: string;
  tiles: string[] | null;
  answer: string[];
  tags: string[];
  /** word_bank/match only: every other correct tile order, each shaped like `answer` — null or missing when there are none (domain/wordBankOrders.ts). */
  alternativeAnswers?: string[][] | null;
  /** The native-script prompt romanized whole, ezafe included ("ketāb-e man") — shown above it when the learner asks (components/lesson/SentenceRomanization.tsx). Missing or null when not authored. */
  promptRomanization?: string | null;
  /** The same for the first accepted answer (a word bank's tiles joined). */
  answerRomanization?: string | null;
  /** Authored hint text, or null when this exercise doesn't have one — not every artifact on the CDN carries this field yet, so callers should treat a missing property the same as null. */
  hint?: string | null;
  /** Recordings of the native-script prompt, by voice id (domain/recordings.ts). Missing or null when nothing is recorded. */
  promptAudio?: AudioMap | null;
  /** Recordings of the first accepted answer, the same shape. */
  answerAudio?: AudioMap | null;
  /** Who says this line, an id from audio.json's `speakers` — whose voices to prefer. Missing or null for a line nobody in particular says. */
  speaker?: string | null;
}

/**
 * Voice id -> that voice's takes of one phrase or word, first take first. Each
 * path is relative to the course version root (it points up out of it, at the
 * shared content-addressed /audio/ directory). A voice missing from the map has
 * no take of this.
 */
export type AudioMap = Record<string, string[]>;

/** audio.json: the course's voices (first is the default) and its cast. Phrases are listed there too, but every exercise and lexeme already carries its own. */
export interface AudioIndexArtifact {
  voices: AudioVoiceEntry[];
  speakers: AudioSpeakerEntry[];
}

export interface AudioVoiceEntry {
  id: string;
  name: string;
  /** How many phrases this voice has at least one take of. */
  recordings: number;
  /** "human" or "ai". */
  kind: string;
  /** How many lexemes this voice has a word-only take of. */
  words?: number;
}

export interface AudioSpeakerEntry {
  id: string;
  name: string;
  /** Voice ids that may play this character. Empty means any voice. */
  voices: string[];
}

/** One entry in lexemes.json, keyed by lexeme tag. */
export interface LexemeIndexEntry {
  gloss: string;
  register: Register | null;
  romanization: string | null;
  romanizationIsAuthored: boolean;
  /** The reading printed ABOVE this surface in "both" script display: Japanese kana furigana. No course publishes this yet, so a missing property means null, same as `ExerciseArtifact.hint` — callers fall back to `romanization` (see domain/romanization.ts's buildLexemeHintMap). */
  reading?: string | null;
  /** Other written forms of this lexeme — an attached ending's spelling after a vowel (ـم is written ‌ام after one). Missing or null when there are none. */
  forms?: string[] | null;
  /** The word said on its own, by voice id (domain/recordings.ts). Missing or null when it hasn't been recorded. */
  audio?: AudioMap | null;
}

/** lexemes.json itself: a flat tag -> entry map. */
export type LexemeIndex = Record<string, LexemeIndexEntry>;

/**
 * One lesson entry inside a theme bucket (course/{code}/v{version}/themes.json).
 * `path` points straight at that lesson's own SkillArtifact — journey lessons
 * at units/{unitKey}/skills/{skillKey}.json exactly as ManifestRef.path
 * already resolves elsewhere, standalone ("theme") lessons at
 * lessons/{lessonKey}.json, uniformly, so a client never needs to know which
 * kind a given entry is before fetching it. No `commonUsageScore` (null) means
 * unscored, sorted last.
 */
export interface ThemeLessonRef {
  id: string;
  path: string;
  commonUsageScore: number | null;
}

/**
 * One theme tag and every lesson tagged with it, pre-sorted by
 * `commonUsageScore` descending (nulls last) — the "structured" browse bucket
 * as-is; "random" is the client's own shuffle of the same list. There is no
 * separate display `name` — `id` (the tag itself, e.g. "Food", "Restaurant")
 * is the only label the backend sends.
 *
 * Themes form a tree of unbounded depth via `parentId` (null = a root tag).
 * `lessons` is already rolled up by the backend: it includes every
 * descendant's lessons too (deduped, same sort), so a lesson tagged with a
 * leaf also appears in every ancestor. A node can carry direct lessons and
 * children at the same time. See domain/themeTree.ts for the tree helpers.
 */
export interface ThemeEntry {
  id: string;
  parentId: string | null;
  lessons: ThemeLessonRef[];
}

/** course/{code}/v{version}/themes.json — the theme-browsing catalog. */
export interface ThemeIndexArtifact {
  themes: ThemeEntry[];
}
