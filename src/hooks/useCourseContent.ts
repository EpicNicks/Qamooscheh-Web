// CDN content-artifact hooks (api/content.ts), layered with react-query for
// caching — content is immutable per course version, so these cache
// essentially forever within a session.
import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { getCourseManifest, getLexemeIndex, getSkillArtifact, getUnitArtifact } from "../api/content";
import { computePathProgress, type PathSkillInput, type PathUnit, type PositionKey } from "../domain/pathProgress";
import type { UnitVocab } from "../domain/courseVocabulary";
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
 * The course's whole content tree, in two CDN fetch stages: every unit
 * artifact the manifest lists (for position ordering + refs), then every
 * skill artifact those units point at (for title/category/arc/exercises — a
 * UnitArtifact's positions hold only {id, path} pointers, per
 * types/content.ts).
 *
 * Shared by useCoursePath and useCourseVocabulary, which want the same two
 * stages and diverge only in what they compute from them. Both used to run
 * this fetch themselves under identical query keys, so they already shared
 * react-query's cache entries; hoisting it here just stops the code being
 * written twice.
 *
 * `skillKeys` is the `${unitKey}/${skillKey}` list in content order — the
 * keys of `skillsByUnitAndKey`, kept as an array because it's also the
 * loaded-content signature useCoursePath memoizes on (and, unlike the map's
 * key set, it doesn't collapse a ref repeated within a unit).
 */
export function useAllSkillArtifacts(course: CourseRef | null | undefined): {
  manifestOrderedUnits: UnitArtifact[];
  skillsByUnitAndKey: Map<string, SkillArtifact>;
  skillKeys: string[];
  skillsReady: boolean;
  isLoading: boolean;
  isError: boolean;
} {
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

  return {
    manifestOrderedUnits,
    skillsByUnitAndKey,
    skillKeys: allSkillRefs.map(({ unitKey, ref }) => `${unitKey}/${ref.id}`),
    skillsReady: allSkillRefs.length > 0 && skillResults.every((r) => r.data != null),
    isLoading: manifestQuery.isLoading || unitsLoading || skillResults.some((r) => r.isLoading),
    isError: manifestQuery.isError || unitsError || skillResults.some((r) => r.isError),
  };
}

/**
 * The whole path/skill-tree, statuses computed against the current cursor,
 * over useAllSkillArtifacts's two-stage fetch.
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
  const { manifestOrderedUnits, skillsByUnitAndKey, skillKeys, skillsReady, isLoading, isError } =
    useAllSkillArtifacts(course);

  // Content artifacts are immutable per course version (staleTime: Infinity),
  // so the course, the loaded unit/skill ids and the cursor fully determine
  // the computed path — while the arrays and map above are rebuilt into fresh
  // objects on every render. Memoizing on that signature keeps `path`'s
  // identity stable across unrelated re-renders (a bootstrap refetch on window
  // focus, a sibling query settling); PathPage keys its scroll-to-current-node
  // effect on `path`, and would otherwise yank the reader back on each one.
  const pathSignature = skillsReady
    ? JSON.stringify([
        course?.code,
        course?.version,
        position ?? null,
        manifestOrderedUnits.map((unit) => unit.id),
        skillKeys,
      ])
    : "";

  const path = useMemo<PathUnit[]>(() => {
    if (!skillsReady) return [];
    return computePathProgress(
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
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pathSignature stands in for the render-unstable inputs above.
  }, [pathSignature]);

  return { path, isLoading, isError };
}

/**
 * Every unit's vocabulary, grouped by lesson (domain/courseVocabulary.ts's
 * UnitVocab), over the same useAllSkillArtifacts fetch useCoursePath runs on
 * — so it shares those react-query cache entries rather than duplicating the
 * network calls, while keeping vocabulary as its own concern rather than
 * threading tags through PathUnit/PathSkill, which know nothing about them.
 *
 * Every skill in a unit contributes its lessons' tags here, standard or not
 * — a story/conversation/song's vocabulary is still vocabulary — unlike
 * useCoursePath, which only cares about a skill's category for gating.
 */
export function useCourseVocabulary(
  course: CourseRef | null | undefined,
): { units: UnitVocab[]; isLoading: boolean; isError: boolean } {
  const { manifestOrderedUnits, skillsByUnitAndKey, skillsReady, isLoading, isError } = useAllSkillArtifacts(course);

  const vocabUnits: UnitVocab[] = skillsReady
    ? manifestOrderedUnits.map((unit) => ({
        unitKey: unit.id,
        title: unit.title,
        lessons: unit.positions.flatMap((pos) =>
          pos.skills.map((ref): { unitKey: string; skillKey: string; title: string; tags: string[] } => {
            const skill = skillsByUnitAndKey.get(`${unit.id}/${ref.id}`);
            return {
              unitKey: unit.id,
              skillKey: ref.id,
              title: skill?.title ?? ref.id,
              tags: [...new Set(skill?.exercises.flatMap((e) => e.tags) ?? [])],
            };
          }),
        ),
      }))
    : [];

  return { units: vocabUnits, isLoading, isError };
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
