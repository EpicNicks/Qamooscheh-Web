import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useBootstrap } from "../hooks/useBootstrap";
import { GraderContext, type GraderState } from "./GraderContext";
import { GRADER_VARIANT, loadGrader } from "./loadGrader";
import type { GraderPointer } from "./types";

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
 * Loads the published grader for the active course's language (bootstrap's
 * `graders`, API_SPEC.md §2.1). Loading starts at idle once bootstrap is
 * known, so the build is cached for offline use before a lesson needs it, and
 * starts at once when a lesson screen asks (RequireGrader). Mounted under
 * RequireOnboarded, where bootstrap has settled.
 */
export function GraderProvider({ children }: { children: ReactNode }) {
  const bootstrap = useBootstrap();
  const pointer: GraderPointer | null = bootstrap.data?.graders.find((g) => g.variant === GRADER_VARIANT) ?? null;
  const language = pointer?.language;
  const version = pointer?.version;
  const manifestSha256 = pointer?.manifestSha256;

  // The state belongs to the build it was loaded for; a stale one reads as loading.
  const buildId = pointer ? `${language}/${version}/${manifestSha256}` : null;
  const [loaded, setLoaded] = useState<{ buildId: string; state: GraderState } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [started, setStarted] = useState(false);

  const start = useCallback(() => setStarted(true), []);

  // Idle start, once there is something to load.
  useEffect(() => {
    if (!buildId) return;
    return whenIdle(start);
  }, [buildId, start]);

  useEffect(() => {
    if (!buildId || !started || !language || version === undefined || !manifestSha256) return;
    let cancelled = false;
    loadGrader({ language, variant: GRADER_VARIANT, version, manifestSha256 }).then(
      (grader) => {
        if (!cancelled) setLoaded({ buildId, state: { status: "ready", grader } });
      },
      (error: unknown) => {
        console.error("Couldn't load the grader", error);
        if (!cancelled) setLoaded({ buildId, state: { status: "unavailable", offline: !navigator.onLine } });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [buildId, started, attempt, language, version, manifestSha256]);

  const retry = useCallback(() => {
    setLoaded(null);
    setAttempt((n) => n + 1);
  }, []);

  const state = useMemo<GraderState>(
    () => (!buildId ? { status: "none" } : loaded?.buildId === buildId ? loaded.state : { status: "loading" }),
    [buildId, loaded],
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
