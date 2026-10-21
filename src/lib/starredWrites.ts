// Saved-word writes, one at a time. Two star/unstar requests in flight at once
// can finish out of order, and the slower earlier reply would then drop or
// restore a word the learner has since changed. So requests are sent serially,
// and the learner's latest choice for any word with a request still pending
// is laid over every list the server returns.
import type { SetStarredRequest, StarredVocabResponse } from "../types/api";

/** Server list with the learner's unsent/in-flight choices applied: starred first, unstarred removed. */
export function overlayPending(serverTags: readonly string[], pending: ReadonlyMap<string, boolean>): string[] {
  const starred = [...pending].filter(([, wanted]) => wanted).map(([tag]) => tag).reverse();
  const rest = serverTags.filter((tag) => !pending.has(tag));
  return [...starred, ...rest];
}

export interface StarredWriter {
  /** Records the learner's choice and returns the list to show right now, given the list currently shown. */
  set(tag: string, starred: boolean, shown: readonly string[]): string[];
  readonly limitMessage: string | null;
  subscribe(listener: () => void): () => void;
}

export interface StarredWriterOptions {
  send: (request: SetStarredRequest) => Promise<StarredVocabResponse>;
  /** Called with the list to show after each settled request, and the server's reply when there was one. */
  onList: (tags: string[], reply: StarredVocabResponse | null) => void;
  /** Maps a failed request to the server's limit wording, or null when it was not a limit refusal. */
  limitMessageFor: (error: unknown) => string | null;
}

export function createStarredWriter({ send, onList, limitMessageFor }: StarredWriterOptions): StarredWriter {
  const pending = new Map<string, boolean>();
  const listeners = new Set<() => void>();
  let lastServerTags: string[] | null = null;
  let draining = false;
  let limitMessage: string | null = null;

  function setLimitMessage(message: string | null) {
    if (message === limitMessage) return;
    limitMessage = message;
    listeners.forEach((listener) => listener());
  }

  async function drain() {
    if (draining) return;
    draining = true;
    try {
      while (pending.size > 0) {
        const [tag, wanted] = pending.entries().next().value as [string, boolean];
        try {
          const reply = await send({ tag, starred: wanted });
          lastServerTags = reply.tags;
          // Keep the entry if the learner changed their mind meanwhile: it is
          // still pending, and the next pass sends the newer choice.
          if (pending.get(tag) === wanted) pending.delete(tag);
          setLimitMessage(null);
          onList(overlayPending(reply.tags, pending), reply);
        } catch (error) {
          if (pending.get(tag) === wanted) pending.delete(tag);
          setLimitMessage(limitMessageFor(error) ?? limitMessage);
          // Fall back to the last list the server gave, still honouring any
          // later choice; with none yet, only the shown list is left to fix.
          if (lastServerTags) onList(overlayPending(lastServerTags, pending), null);
        }
      }
    } finally {
      draining = false;
    }
  }

  return {
    set(tag, starred, shown) {
      // Before any reply, the list on screen is the last thing the server said.
      lastServerTags ??= [...shown];
      // A re-set moves the word to the end so the newest choice is sent last.
      pending.delete(tag);
      pending.set(tag, starred);
      void drain();
      return overlayPending(shown, pending);
    },
    get limitMessage() {
      return limitMessage;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
