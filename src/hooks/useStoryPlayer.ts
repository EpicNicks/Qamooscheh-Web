// The story reader's two players over one set of per-line clips
// (domain/storyPlayer.ts has the pure rules):
//
//   * main  — every clip in order, play/pause, started from any line. Pausing
//             keeps its place, and playing again picks up at the start of that
//             line's clip (clips are the unit; there is no time axis).
//   * solo  — one line's own button. It pauses main and never resumes it: the
//             learner presses main's play when they want the story back.
//
// Both play through domain/playback.ts, so only one clip is ever heard.
// Reaching the end of the last clip is `finished`, reported once per run
// through `onFinished` (how a version is marked read).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { play } from "../domain/playback";
import { isLastClip, nextPlayableIndex, segmentsFor, type Segment } from "../domain/storyPlayer";
import { setMainStoryAudioPlaying } from "../domain/storyAudioState";

export type MainStatus = "idle" | "playing" | "paused";

export interface StoryPlayer {
  status: MainStatus;
  /** The line main is on (playing or paused there), or null before it starts and after it finishes. */
  activeIndex: number | null;
  /** The line whose own button is playing, if any. */
  soloIndex: number | null;
  finished: boolean;
  segments: Segment[];
  /** Plays main from the start, from where it paused, or pauses it. */
  toggleMain: () => void;
  /** Plays main from this line (a timeline press). */
  playFrom: (index: number) => void;
  /** Plays only this line, pausing main. */
  playSentence: (index: number) => void;
}

/** `urls[i]` is line i's clip, or null when it has none. */
export function useStoryPlayer(urls: readonly (string | null)[], onFinished: () => void): StoryPlayer {
  const playable = useMemo(() => urls.map((url) => url !== null), [urls]);
  const [status, setStatus] = useState<MainStatus>("idle");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [soloIndex, setSoloIndex] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  // Latest values for the playback callbacks, which outlive the render that made them.
  const latest = useRef({ urls, playable, onFinished });
  useEffect(() => {
    latest.current = { urls, playable, onFinished };
  });
  const stopRef = useRef<() => void>(() => {});
  // The chain calls itself when a clip ends; through a ref, since a callback can't capture its own declaration.
  const startRef = useRef<(from: number) => void>(() => {});
  // Bumped on every start and pause, so a clip that was cut off or replaced
  // can't move the chain on when its end finally reports in.
  const generation = useRef(0);

  const pauseMain = useCallback(() => {
    generation.current++;
    stopRef.current();
    setMainStoryAudioPlaying(false);
    setStatus((current) => (current === "playing" ? "paused" : current));
  }, []);

  const startMainAt = useCallback((from: number) => {
    const { urls: clips, playable: flags } = latest.current;
    const index = nextPlayableIndex(flags, from);
    if (index === null) {
      generation.current++;
      setMainStoryAudioPlaying(false);
      setStatus("idle");
      setActiveIndex(null);
      return;
    }
    const mine = ++generation.current;
    setSoloIndex(null);
    setFinished(false);
    setActiveIndex(index);
    setStatus("playing");
    setMainStoryAudioPlaying(true);
    stopRef.current = play({ url: clips[index], text: "", speechLang: null }, (completed) => {
      if (mine !== generation.current) return;
      if (!completed) {
        // Cut off by something else (or the clip failed): stay on this line, paused.
        setMainStoryAudioPlaying(false);
        setStatus("paused");
        return;
      }
      if (isLastClip(flags, index)) {
        setMainStoryAudioPlaying(false);
        setStatus("idle");
        setActiveIndex(null);
        setFinished(true);
        latest.current.onFinished();
        return;
      }
      startRef.current(index + 1);
    }).stop;
  }, []);

  useEffect(() => {
    startRef.current = startMainAt;
  }, [startMainAt]);

  const toggleMain = useCallback(() => {
    if (status === "playing") {
      pauseMain();
    } else {
      startMainAt(status === "paused" && activeIndex !== null ? activeIndex : 0);
    }
  }, [status, activeIndex, pauseMain, startMainAt]);

  const playSentence = useCallback(
    (index: number) => {
      const url = latest.current.urls[index];
      if (!url) return;
      pauseMain();
      setSoloIndex(index);
      stopRef.current = play({ url, text: "", speechLang: null }, () => setSoloIndex((current) => (current === index ? null : current))).stop;
    },
    [pauseMain],
  );

  // Leaving the page silences it, and nothing stays flagged as narrating.
  useEffect(
    () => () => {
      generation.current++;
      stopRef.current();
      setMainStoryAudioPlaying(false);
    },
    [],
  );

  const segments = useMemo(() => segmentsFor(playable, activeIndex, finished), [playable, activeIndex, finished]);

  return { status, activeIndex, soloIndex, finished, segments, toggleMain, playFrom: startMainAt, playSentence };
}
