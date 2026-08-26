// CDN content-artifact hooks (api/content.ts), layered with react-query for
// caching — content is immutable per course version, so these cache
// essentially forever within a session.
import { useQueries, useQuery } from "@tanstack/react-query";
import { getCourseManifest, getLexemeIndex, getSkillArtifact, getUnitArtifact } from "../api/content";
import { computePathProgress, type PathSkillInput, type PathUnit, type PositionKey } from "../domain/pathProgress";
import type { CourseRef, SkillRef } from "../types/api";
import type { CourseManifest, ManifestRef, SkillArtifact, UnitArtifact } from "../types/content";

export function useCourseManifest(course: CourseRef | null | undefined) {
  return useQuery({
    queryKey: ["content", "manifest", course?.code, course?.version],
    queryFn: () => getCourseManifest(course!.code, course!.version, course!.manifestSha256),
    enabled: course != null,
    staleTime: Infinity,
  });
}

/**
 * The flat tag -> gloss/romanization map (lexemes.json), fetched once per
 * course version. What powers the "hover a word to see its meaning" feature
 * Qamooscheh.Content's README calls out as this index's whole purpose.
 */
export function useLexemeIndex(course: CourseRef | null | undefined) {
  const manifestQuery = useCourseManifest(course);
  return useQuery({
    queryKey: ["content", "lexemes", course?.code, course?.version],
    queryFn: () => getLexemeIndex(course!.code, course!.version, manifestQuery.data!.lexemeIndexPath),
    enabled: course != null && manifestQuery.data != null,
    staleTime: Infinity,
  });
}

export function useUnitArtifact(course: CourseRef | null | undefined, unitRef: ManifestRef | null | undefined) {
  return useQuery({
    queryKey: ["content", "unit", course?.code, course?.version, unitRef?.id],
    queryFn: () => getUnitArtifact(course!.code, course!.version, unitRef!.path),
    enabled: course != null && unitRef != null,
    staleTime: Infinity,
  });
}

export function useSkillArtifact(course: CourseRef | null | undefined, skillRef: ManifestRef | null | undefined) {
  return useQuery({
    queryKey: ["content", "skill", course?.code, course?.version, skillRef?.id],
    queryFn: () => getSkillArtifact(course!.code, course!.version, skillRef!.path),
    enabled: course != null && skillRef != null,
    staleTime: Infinity,
  });
}

/** Fetches every unit artifact the manifest lists, in parallel. */
export function useAllUnitArtifacts(course: CourseRef | null | undefined, manifest: CourseManifest | undefined) {
  const results = useQueries({
    queries: (manifest?.units ?? []).map((unitRef) => ({
      queryKey: ["content", "unit", course?.code, course?.version, unitRef.id],
      queryFn: () => getUnitArtifact(course!.code, course!.version, unitRef.path),
      enabled: course != null,
      staleTime: Infinity,
    })),
  });

  return {
    units: results.map((r) => r.data).filter((u): u is UnitArtifact => u != null),
    isLoading: results.some((r) => r.isLoading),
    isError: results.some((r) => r.isError),
  };
}

/**
 * The whole path/skill-tree, statuses computed against the current cursor.
 * Two fetch stages, both against the CDN: every unit artifact (for position
 * ordering + refs), then every skill artifact those units point at (for
 * title/category/arc — a UnitArtifact's positions hold only {id, path}
 * pointers, per types/content.ts).
 *
 * This is also the one place the artifact's shape is turned into
 * pathProgress.ts's: standard skills keep their position grouping (so a fork
 * survives into the road), everything else flattens into one content-ordered
 * list (so groupByArc can nest chapters in the order they're authored).
 */
export function useCoursePath(
  course: CourseRef | null | undefined,
  position: PositionKey | null | undefined,
): { path: PathUnit[]; isLoading: boolean; isError: boolean } {
  const manifestQuery = useCourseManifest(course);
  const { units, isLoading: unitsLoading, isError: unitsError } = useAllUnitArtifacts(course, manifestQuery.data);

  const manifestOrderedUnits =
    manifestQuery.data?.units
      .map((ref) => units.find((u) => u.id === ref.id))
      .filter((u): u is UnitArtifact => u != null) ?? [];

  const unitsReady = manifestOrderedUnits.length === (manifestQuery.data?.units.length ?? -1);

  const allSkillRefs = unitsReady
    ? manifestOrderedUnits.flatMap((unit) =>
        unit.positions.flatMap((pos) => pos.skills.map((ref) => ({ unitKey: unit.id, ref }))),
      )
    : [];

  const skillResults = useQueries({
    queries: allSkillRefs.map(({ ref }) => ({
      queryKey: ["content", "skill", course?.code, course?.version, ref.id],
      queryFn: () => getSkillArtifact(course!.code, course!.version, ref.path),
      enabled: course != null && unitsReady,
      staleTime: Infinity,
    })),
  });

  const skillsByUnitAndKey = new Map<string, SkillArtifact>();
  allSkillRefs.forEach(({ unitKey, ref }, i) => {
    const data = skillResults[i]?.data;
    if (data) skillsByUnitAndKey.set(`${unitKey}/${ref.id}`, data);
  });

  const skillsReady = allSkillRefs.length > 0 && skillResults.every((r) => r.data != null);

  const path = skillsReady
    ? computePathProgress(
        manifestOrderedUnits.map((unit) => {
          const toInput = (ref: ManifestRef): PathSkillInput => {
            const skill = skillsByUnitAndKey.get(`${unit.id}/${ref.id}`);
            return {
              skillKey: ref.id,
              title: skill?.title ?? ref.id,
              category: skill?.category ?? "standard",
              arc: skill?.arc ?? undefined,
            };
          };

          const inputs = unit.positions.map((pos) => pos.skills.map(toInput));

          return {
            unitKey: unit.id,
            title: unit.title,
            // Only standard skills sit in the sequence the cursor walks, so
            // only they form positions. A position holding nothing standard
            // contributes none, which keeps these indices comparable with the
            // cursor the same way the old standard-only list did.
            standardPositions: inputs
              .map((skills) => ({ skills: skills.filter((s) => s.category === "standard") }))
              .filter((pos) => pos.skills.length > 0),
            otherSkills: inputs.flat().filter((s) => s.category !== "standard"),
          };
        }),
        position ?? null,
      )
    : [];

  return {
    path,
    isLoading: manifestQuery.isLoading || unitsLoading || skillResults.some((r) => r.isLoading),
    isError: manifestQuery.isError || unitsError || skillResults.some((r) => r.isError),
  };
}

/**
 * Resolves a specific, small set of (unitKey, skillKey) refs to their
 * SkillArtifacts — what a session plan (usually one skill) or a checkpoint
 * plan (several, across units) needs, without fetching the whole course tree
 * the way useCoursePath does.
 */
export function useSkillArtifactsForRefs(
  course: CourseRef | null | undefined,
  refs: SkillRef[],
): { skills: Map<string, SkillArtifact>; isLoading: boolean; isError: boolean } {
  const manifestQuery = useCourseManifest(course);

  const neededUnitRefs = Array.from(new Set(refs.map((r) => r.unitKey)))
    .map((unitKey) => manifestQuery.data?.units.find((u) => u.id === unitKey))
    .filter((u): u is ManifestRef => u != null);

  const unitResults = useQueries({
    queries: neededUnitRefs.map((unitRef) => ({
      queryKey: ["content", "unit", course?.code, course?.version, unitRef.id],
      queryFn: () => getUnitArtifact(course!.code, course!.version, unitRef.path),
      enabled: course != null,
      staleTime: Infinity,
    })),
  });

  const unitsByKey = new Map<string, UnitArtifact>();
  neededUnitRefs.forEach((ref, i) => {
    const data = unitResults[i]?.data;
    if (data) unitsByKey.set(ref.id, data);
  });

  const skillRefsToFetch = refs
    .map((r) => {
      const unit = unitsByKey.get(r.unitKey);
      // Which position a skill sits at is irrelevant here — this resolves
      // named refs, so it just looks across every position in the unit.
      const skillRef = unit?.positions.flatMap((p) => p.skills).find((s) => s.id === r.skillKey);
      return skillRef ? { key: `${r.unitKey}/${r.skillKey}`, unitKey: r.unitKey, ref: skillRef } : null;
    })
    .filter((x): x is { key: string; unitKey: string; ref: ManifestRef } => x != null);

  const skillResults = useQueries({
    queries: skillRefsToFetch.map(({ ref }) => ({
      queryKey: ["content", "skill", course?.code, course?.version, ref.id],
      queryFn: () => getSkillArtifact(course!.code, course!.version, ref.path),
      enabled: course != null,
      staleTime: Infinity,
    })),
  });

  const skills = new Map<string, SkillArtifact>();
  skillRefsToFetch.forEach(({ key }, i) => {
    const data = skillResults[i]?.data;
    if (data) skills.set(key, data);
  });

  return {
    skills,
    isLoading: manifestQuery.isLoading || unitResults.some((r) => r.isLoading) || skillResults.some((r) => r.isLoading),
    isError: manifestQuery.isError || unitResults.some((r) => r.isError) || skillResults.some((r) => r.isError),
  };
}
