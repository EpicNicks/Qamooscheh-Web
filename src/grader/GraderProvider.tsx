import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useBootstrap } from "../hooks/useBootstrap";
import { GraderContext, type GraderState } from "./GraderContext";
import { loadGrader } from "./loadGrader";

/** The variant this client runs: the build Android runs too, so both share an artifact and a version stream. */
const GRADER_VARIANT = "browser";

/** Runs `callback` when the browser is idle, or soon after where it has no idle callbacks (Safari). */
function whenIdle(callback: () => void): () => void {
  if (typeof requestIdleCallback === "function") {
    const handle = requestIdleCallback(callback);
    return () => cancelIdleCallback(handle);
  }
  const handle = setTimeout(callback, 1000);
  return () => clearTimeout(handle);
}

/**
 * Loads the published grader for the active course's language (the language of
 * bootstrap's `graders`, API_SPEC.md §2.1). The build is the one shipped with
 * this app (loadGrader.ts), not the one bootstrap names: a newer grader
 * reaches users by a rebuild of the app. Loading starts at idle once bootstrap
 * is known, so the build is cached for offline use before a lesson needs it,
 * and starts at once when a lesson screen asks (RequireGrader). Mounted under
 * RequireOnboarded, where bootstrap has settled.
 */
export function GraderProvider({ children }: { children: ReactNode }) {
  const bootstrap = useBootstrap();
  const language = bootstrap.data?.graders.find((g) => g.variant === GRADER_VARIANT)?.language ?? null;

  // The state belongs to the language it was loaded for; a stale one reads as loading.
  const [loaded, setLoaded] = useState<{ language: string; state: GraderState } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [started, setStarted] = useState(false);

  const start = useCallback(() => setStarted(true), []);

  // Idle start, once there is something to load.
  useEffect(() => {
    if (!language) return;
    return whenIdle(start);
  }, [language, start]);

  useEffect(() => {
    if (!language || !started) return;
    let cancelled = false;
    loadGrader(language).then(
      (grader) => {
        if (!cancelled) setLoaded({ language, state: grader ? { status: "ready", grader } : { status: "none" } });
      },
      (error: unknown) => {
        console.error("Couldn't load the grader", error);
        if (!cancelled) setLoaded({ language, state: { status: "unavailable", offline: !navigator.onLine } });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [language, started, attempt]);

  const retry = useCallback(() => {
    setLoaded(null);
    setAttempt((n) => n + 1);
  }, []);

  const state = useMemo<GraderState>(
    () => (!language ? { status: "none" } : loaded?.language === language ? loaded.state : { status: "loading" }),
    [language, loaded],
  );

  // Back online after a failure: try again.
  const failed = state.status === "unavailable";
  useEffect(() => {
    if (!failed) return;
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [failed, retry]);

  const ensure = useCallback(() => {
    start();
    if (failed) retry();
  }, [start, failed, retry]);

  const value = useMemo(() => ({ state, ensure }), [state, ensure]);
  return <GraderContext value={value}>{children}</GraderContext>;
}
