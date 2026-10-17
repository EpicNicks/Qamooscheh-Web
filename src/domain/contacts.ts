// Contacts matching — API_SPEC.md §2.6 "Contacts matching". A browser has no
// address-book access, so the learner pastes emails; only SHA-256 hashes of
// them are sent. The hash must be of the trimmed, lower-cased address.

/** The server's per-call cap; a longer list is a 400. */
export const MATCH_MAX_HASHES = 500;

// Deliberately loose: the server only ever compares hashes, so this just
// filters out pasted noise. Display-name forms like `Sara <sara@x.com>` are
// handled by taking the address inside the angle brackets.
const EMAIL = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

/** Every distinct, well-formed email in free-form pasted text, normalized, in first-seen order. */
export function parseEmails(text: string): string[] {
  const seen = new Set<string>();
  for (const token of text.split(/[\n,;]+/)) {
    const bracketed = /<([^>]*)>/.exec(token);
    const email = (bracketed ? bracketed[1] : token).trim().toLowerCase();
    if (EMAIL.test(email)) seen.add(email);
  }
  return [...seen];
}

/** Lower-case hex SHA-256 of an already-normalized email. */
export async function hashEmail(email: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Copy for a failed toggle or match. `retryAt` is the 429 body's, when the daily allowance ran out. */
export function contactsErrorCopy(status: number | null, retryAt?: string): string {
  if (status === 429) {
    const when = retryAt ? new Date(retryAt) : null;
    return when && !Number.isNaN(when.getTime())
      ? `You've checked a lot of addresses. Try again after ${when.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`
      : "You've checked too many addresses for now. Try again later.";
  }
  if (status === 400) return "Those addresses couldn't be checked. Make sure each one is a valid email.";
  return "Something went wrong. Please try again.";
}
