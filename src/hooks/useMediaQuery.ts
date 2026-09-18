import { useCallback, useSyncExternalStore } from "react";
import { MEDIA_MOBILE } from "../theme/breakpoints";

// One MediaQueryList per distinct query, module-scoped. matchMedia() is called
// on every getSnapshot, so without this a render-heavy tree allocates a fresh
// MediaQueryList per component per render. The snapshot itself is a boolean
// (a primitive), so React's own identity comparison stays stable regardless.
const lists = new Map<string, MediaQueryList>();
function listFor(query: string): MediaQueryList {
  let list = lists.get(query);
  if (!list) {
    list = window.matchMedia(query);
    lists.set(query, list);
  }
  return list;
}

/**
 * Whether `query` currently matches, re-rendering when that changes.
 *
 * No getServerSnapshot: this app is a pure SPA (main.tsx uses createRoot, never
 * hydrateRoot), so useSyncExternalStore's server path is unreachable and adding
 * a third argument would only invite someone to trust a guessed value.
 *
 * Reach for this ONLY when the difference is structural — a different DOM tree,
 * or a number the geometry needs as a number. Anything that is purely visual
 * belongs in an @media block in the relevant CSS module, where it can't get out
 * of step with the JS at the boundary.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = listFor(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => listFor(query).matches);
}

/** The app's one breakpoint, so no caller has to import the query string. */
export function useIsMobile(): boolean {
  return useMediaQuery(MEDIA_MOBILE);
}
