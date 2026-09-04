// Client-side mirror of lexeme_card, keyed by lexeme tag. Populated from
// SubmitSessionsResponse/CheckpointSubmitResponse's `cards` arrays (the
// server's authoritative post-grade state), never computed locally.
//
// What this is for: API_SPEC.md §2.5's "exercise resolution step" — deciding
// whether a composite exercise (has both `answer` and `tiles`) serves as
// word_bank or type_in the first time it's shown in a lesson. The real rule
// is FSRS-based (LexemeCard.State.IsNew, recent-lapse check); this store only
// gives the client the same CardState fields the server already computed, so
// hooks/useLessonEngine.ts can approximate that rule without reimplementing
// FSRS client-side. See that file for the actual (simplified) resolution
// heuristic — it is the thing to refine once the Persian/Japanese-specific
// passes land, not this storage layer.
import { safeStorage } from "./safeStorage";
import type { CardState } from "../types/api";

function storageKey(userId: string): string {
  return `qamooscheh.cards.${userId}`;
}

export function loadCardStates(userId: string): Record<string, CardState> {
  const raw = safeStorage.getItem(storageKey(userId));
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, CardState>;
  } catch {
    return {};
  }
}

/** Merges freshly-graded cards into the local mirror, keyed by lexemeTag. */
export function mergeCardStates(userId: string, cards: CardState[]): void {
  const current = loadCardStates(userId);
  for (const card of cards) current[card.lexemeTag] = card;
  safeStorage.setItem(storageKey(userId), JSON.stringify(current));
}
