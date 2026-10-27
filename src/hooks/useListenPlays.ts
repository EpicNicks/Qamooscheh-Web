// The play counter of a listening test (API_SPEC.md §2.3 point 8): the
// learner hears the prompt up to MAX_PLAYS times, and each play after the
// first lowers the answer's XP. Play is locked while a play is running, so a
// play can't be cut off and restarted for free; only a play that runs to its
// end is counted, and a recording that fails to load is not charged. The
// slowed replay counts the same as any other.
import { useEffect, useRef, useState } from "react";
import { play as startPlayback, SLOW_RATE } from "../domain/playback";

export const MAX_PLAYS = 3;

export interface ListenPlays {
  status: "idle" | "playing";
  /** Plays that have run to their end. */
  completed: number;
  /** What to submit as `playsUsed`: at least 1, since answering is itself having listened. */
  playsUsed: () => number;
  /** False once the plays are used up, and while one is still running. */
  canPlay: boolean;
  play: () => void;
  playSlow: () => void;
}

/** `free` is set once the answer is in: the review can replay without limit, and nothing more is counted. */
export function useListenPlays(audioUrl: string | null, free: boolean): ListenPlays {
  const [status, setStatus] = useState<"idle" | "playing">("idle");
  const [completed, setCompleted] = useState(0);
  const completedRef = useRef(0);
  const stopRef = useRef<() => void>(() => {});
  const generationRef = useRef(0);
  const playingRef = useRef(false);

  function start(rate: number) {
    if (!audioUrl || (!free && (completedRef.current >= MAX_PLAYS || playingRef.current))) return;
    stopRef.current();
    const generation = ++generationRef.current;
    playingRef.current = true;
    setStatus("playing");
    // No text or language: a listening test never reads aloud in a synthetic voice.
    stopRef.current = startPlayback({ url: audioUrl, text: "", speechLang: null, rate }, (ranToEnd) => {
      if (generation !== generationRef.current) return;
      playingRef.current = false;
      setStatus("idle");
      if (ranToEnd && !free) {
        completedRef.current += 1;
        setCompleted(completedRef.current);
      }
    }).stop;
  }

  useEffect(() => () => stopRef.current(), []);

  return {
    status,
    completed,
    playsUsed: () => Math.min(MAX_PLAYS, Math.max(1, completedRef.current)),
    canPlay: !!audioUrl && (free || (completed < MAX_PLAYS && status === "idle")),
    play: () => start(1),
    playSlow: () => start(SLOW_RATE),
  };
}
