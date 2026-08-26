// The client's own half of API_SPEC.md §1's "Api is never on the content
// read path" — fetches course artifacts directly from the CDN
// (CONTENT_BASE_URL), never through httpClient/apiFetch. Only the root
// manifest is hash-verified (see lib/sha256.ts); child artifacts are reached
// by following the trusted manifest's own relative paths.
import { CONTENT_BASE_URL } from "../config";
import { fetchAndVerifyJson } from "../lib/sha256";
import type { CourseManifest, LexemeIndex, SkillArtifact, UnitArtifact } from "../types/content";

function courseRoot(courseCode: string, version: number): string {
  return `${CONTENT_BASE_URL}/course/${courseCode}/v${version}`;
}

export function getCourseManifest(
  courseCode: string,
  version: number,
  manifestSha256: string,
): Promise<CourseManifest> {
  return fetchAndVerifyJson<CourseManifest>(`${courseRoot(courseCode, version)}/manifest.json`, manifestSha256);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return (await response.json()) as T;
}

export function getUnitArtifact(courseCode: string, version: number, unitRefPath: string): Promise<UnitArtifact> {
  return fetchJson<UnitArtifact>(`${courseRoot(courseCode, version)}/${unitRefPath}`);
}

export function getSkillArtifact(courseCode: string, version: number, skillRefPath: string): Promise<SkillArtifact> {
  return fetchJson<SkillArtifact>(`${courseRoot(courseCode, version)}/${skillRefPath}`);
}

export function getLexemeIndex(courseCode: string, version: number, lexemeIndexPath: string): Promise<LexemeIndex> {
  return fetchJson<LexemeIndex>(`${courseRoot(courseCode, version)}/${lexemeIndexPath}`);
}
