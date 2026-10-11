// When a word's hint closes after the pointer leaves it. The hint sits a few
// pixels off the word, and the learner may want to reach it (its "Verb forms"
// entry), so the pointer is given a moment to cross the gap before the hint
// goes: leaving cancels nothing at once, entering the word OR the hint again
// within the delay keeps it open. (The hint is a DOM child of the word, so
// either one entering is the word's own pointer-enter.)

/** Long enough to cross the gap between the word and its hint, short enough not to feel stuck. */
export const HINT_CLOSE_DELAY_MS = 150;

export interface HoverCloser {
  /** The pointer is over the word or the hint: opens now, and cancels a pending close. */
  enter(): void;
  /** The pointer left the word and the hint: closes after the delay unless it comes back. */
  leave(): void;
  /** Closes now, dropping a pending close — a dismissal, or the word going away. */
  close(): void;
}

export function createHoverCloser(
  setHovered: (hovered: boolean) => void,
  delayMs: number = HINT_CLOSE_DELAY_MS,
): HoverCloser {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const cancel = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  return {
    enter() {
      cancel();
      setHovered(true);
    },
    leave() {
      cancel();
      timer = setTimeout(() => {
        timer = null;
        setHovered(false);
      }, delayMs);
    },
    close() {
      cancel();
      setHovered(false);
    },
  };
}
