import { useQuery } from "@tanstack/react-query";
import { getActivity, getCourseCatalog } from "../api/courses";

/**
 * GET /v1/courses. `staleTime: Infinity` — the catalog is authored content
 * mirrored into Postgres by the publish pipeline, so within one session it
 * genuinely cannot change. Both the switcher (for names) and the catalog
 * modal read this, so the second consumer costs no round trip.
 */
export function useCourseCatalog() {
  return useQuery({
    queryKey: ["courseCatalog"],
    queryFn: getCourseCatalog,
    staleTime: Infinity,
  });
}

/**
 * GET /v1/activity/{courseCode}. Nothing renders this yet — the plan's
 * per-language dashboard is a later pass; this exists so the data is
 * *fetchable*, which is what the endpoint was built for.
 */
export function useActivity(courseCode: string | null | undefined) {
  return useQuery({
    queryKey: ["activity", courseCode],
    queryFn: () => getActivity(courseCode!),
    enabled: courseCode != null,
  });
}
