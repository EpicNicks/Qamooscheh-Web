// The story reader's player, as pure functions (hooks/useStoryPlayer.ts drives
// the audio). A story's audio is one recording per line, never a whole-chapter
// file, so the "main" player is those clips chained in authored order and its
// timeline has one segment per line instead of a time axis. A line with no
// recording has no clip: the chain steps over it and its segment can't be
// pressed (Qamooscheh-Web#146).

export type SegmentState = "done" | "active" | "todo";

/** One timeline segment: where the chain is relative to it, and whether it has a clip to play. */
export interface Segment {
  state: SegmentState;
  playable: boolean;
}

/** The first line at or after `from` that has a clip, or null when none is left. */
export function nextPlayableIndex(playable: readonly boolean[], from: number): number | null {
  for (let i = Math.max(0, from); i < playable.length; i++) {
    if (playable[i]) return i;
  }
  return null;
}

/**
 * The timeline, one segment per line. Lines before the current one are done;
 * with nothing current (`activeIndex` null) the bar is empty, or full once the
 * chain has `finished`.
 */
export function segmentsFor(playable: readonly boolean[], activeIndex: number | null, finished: boolean): Segment[] {
  return playable.map((isPlayable, i) => ({
    playable: isPlayable,
    state: finished || (activeIndex !== null && i < activeIndex) ? "done" : i === activeIndex ? "active" : "todo",
  }));
}

/** Whether the chain reaching the end of line `index` ends it: nothing playable is left after it. */
export function isLastClip(playable: readonly boolean[], index: number): boolean {
  return nextPlayableIndex(playable, index + 1) === null;
}
