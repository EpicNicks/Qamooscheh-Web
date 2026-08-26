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
}

/** units/{unitKey}.json */
export interface UnitArtifact {
  id: string;
  title: string;
  skills: ManifestRef[];
}

/** units/{unitKey}/skills/{skillKey}.json */
export interface SkillArtifact {
  id: string;
  title: string;
  category: SkillCategory;
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
}

/** One entry in lexemes.json, keyed by lexeme tag. */
export interface LexemeIndexEntry {
  gloss: string;
  register: Register | null;
  romanization: string | null;
  romanizationIsAuthored: boolean;
}

/** lexemes.json itself: a flat tag -> entry map. */
export type LexemeIndex = Record<string, LexemeIndexEntry>;
