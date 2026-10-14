// The client's own half of API_SPEC.md §1's "Api is never on the content
// read path" — fetches course artifacts directly from the CDN
// (CONTENT_BASE_URL), never through httpClient/apiFetch. Only the root
// manifest is hash-verified (see lib/sha256.ts); child artifacts are reached
// by following the trusted manifest's own relative paths.
import { CONTENT_BASE_URL } from "../config";
import { contentCacheName, fetchContentJson } from "../lib/contentCache";
import { verifyManifestBytes } from "../lib/sha256";
import type { AudioIndexArtifact, CourseManifest, LexemeIndex, SkillArtifact, ThemeIndexArtifact, UnitArtifact, VerbIndex } from "../types/content";

function courseRoot(courseCode: string, version: number): string {
  return `${CONTENT_BASE_URL}/course/${courseCode}/v${version}`;
}

export function getCourseManifest(
  courseCode: string,
  version: number,
  manifestSha256: string,
): Promise<CourseManifest> {
  return fetchContentJson<CourseManifest>(
    `${courseRoot(courseCode, version)}/manifest.json`,
    contentCacheName(courseCode, version),
    (bytes) => verifyManifestBytes(bytes, manifestSha256),
  );
}

// Versioned files never change, so they come from the version's Cache Storage
// cache when it has them (lib/contentCache.ts) and are downloaded once.
function fetchJson<T>(courseCode: string, version: number, path: string): Promise<T> {
  return fetchContentJson<T>(`${courseRoot(courseCode, version)}/${path}`, contentCacheName(courseCode, version));
}

export function getUnitArtifact(courseCode: string, version: number, unitRefPath: string): Promise<UnitArtifact> {
  return fetchJson<UnitArtifact>(courseCode, version, unitRefPath);
}

export function getSkillArtifact(courseCode: string, version: number, skillRefPath: string): Promise<SkillArtifact> {
  return fetchJson<SkillArtifact>(courseCode, version, skillRefPath);
}

export function getLexemeIndex(courseCode: string, version: number, lexemeIndexPath: string): Promise<LexemeIndex> {
  return fetchJson<LexemeIndex>(courseCode, version, lexemeIndexPath);
}

export function getVerbIndex(courseCode: string, version: number, verbIndexPath: string): Promise<VerbIndex> {
  return fetchJson<VerbIndex>(courseCode, version, verbIndexPath);
}

export function getThemeIndex(
  courseCode: string,
  version: number,
  themeIndexPath: string,
): Promise<ThemeIndexArtifact> {
  return fetchJson<ThemeIndexArtifact>(courseCode, version, themeIndexPath);
}

export function getAudioIndex(courseCode: string, version: number, audioIndexPath: string): Promise<AudioIndexArtifact> {
  return fetchJson<AudioIndexArtifact>(courseCode, version, audioIndexPath);
}

/**
 * A recording's absolute URL. Recording paths are relative to the version
 * root and climb out of it (../../../audio/{sha256}.mp3), so they're resolved
 * as URLs rather than concatenated — and against the page when
 * CONTENT_BASE_URL is itself relative.
 */
export function contentUrl(courseCode: string, version: number, relativePath: string): string {
  return new URL(relativePath, new URL(`${courseRoot(courseCode, version)}/`, window.location.href)).href;
}
