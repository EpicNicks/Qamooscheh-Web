// Usernames (handles) and friend-search state — API_SPEC.md §2.6 "Usernames
// and friend search". The format rules mirror the backend's UsernameFormat so
// a bad handle is caught before a request; the server stays the authority.
import type { FriendRelationship } from "../types/api";

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

/** Trim, drop one leading `@`, lower-case: the form every request and comparison uses. */
export function normalizeUsername(input: string): string {
  const trimmed = input.trim();
  return (trimmed.startsWith("@") ? trimmed.slice(1) : trimmed).trim().toLowerCase();
}

/** Why a handle is malformed, or null when it is well-formed. Expects a normalized value. */
export function usernameFormatProblem(username: string): string | null {
  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    return `Usernames are ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters.`;
  }
  if (!/^[a-z0-9_.]+$/.test(username)) {
    return "Use only lowercase letters, numbers, underscores and dots.";
  }
  if (username.startsWith(".") || username.endsWith(".") || username.includes("..")) {
    return "A username can't start or end with a dot, or have two dots in a row.";
  }
  return null;
}

export type FriendAction = "add" | "pending" | "accept" | "view";

/** The one action a search hit offers for the caller's side of the pair. */
export function actionForRelationship(relationship: FriendRelationship): FriendAction {
  switch (relationship) {
    case "none":
      return "add";
    case "request_sent":
      return "pending";
    case "request_received":
      return "accept";
    case "friends":
      return "view";
  }
}

export const FRIEND_ACTION_LABEL: Record<FriendAction, string> = {
  add: "Add",
  pending: "Pending",
  accept: "Accept",
  view: "View",
};

/** What an error from search or a friend request says, in friendly words. */
export function friendErrorCopy(status: number | null): string {
  if (status === 429) return "You're searching too fast. Wait a moment and try again.";
  if (status === 409) return "That request can't be sent right now. Refresh and check the result.";
  if (status === 404) return "That learner couldn't be found.";
  return "Something went wrong. Please try again.";
}

function formatChangeDate(canChangeAt: string): string {
  const date = new Date(canChangeAt);
  if (Number.isNaN(date.getTime())) return canChangeAt;
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

/** Copy for a rejected PUT /v1/username (400 invalid|reserved, 409 taken|held|cooldown, 429). */
export function renameErrorCopy(status: number | null, reason: string | undefined, canChangeAt?: string): string {
  if (status === 429) return "Too many tries. Wait a moment and try again.";
  switch (reason) {
    case "invalid":
      return "That isn't a valid username. Use 3-20 lowercase letters, numbers, underscores or dots.";
    case "reserved":
      return "That username isn't allowed. Try another.";
    case "taken":
      return "Someone already has that username.";
    case "held":
      return "That username was recently given up and is held for 30 days for its previous owner.";
    case "cooldown":
      return canChangeAt
        ? `You can change your username once every 30 days. You can change it again on ${formatChangeDate(canChangeAt)}.`
        : "You can change your username once every 30 days.";
    default:
      return "Couldn't change your username. Please try again.";
  }
}

/** Copy for an availability result that isn't "available" (reason invalid|reserved|taken|held), or a failed check. */
export function availabilityCopy(status: number | null, reason: string | null | undefined): string {
  if (status === 429) return "Checking too fast. Wait a moment and try again.";
  switch (reason) {
    case "invalid":
      return "That isn't a valid username. Use 3-20 lowercase letters, numbers, underscores or dots.";
    case "reserved":
      return "That username isn't allowed. Try another.";
    case "taken":
      return "Someone already has that username.";
    case "held":
      return "That username was recently given up and is held for 30 days for its previous owner.";
    default:
      return "Couldn't check that username. You can still try to save it.";
  }
}
