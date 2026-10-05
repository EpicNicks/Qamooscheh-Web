import type { RegistrationStatusResponse } from "../types/api";

/**
 * What Login/Register may offer, from useRegistrationStatus()'s query state.
 *
 * - "pending": no answer yet (first load this session). Show neither the
 *   form nor the closed notice, rather than flash one and swap it.
 * - "open": the server said `enabled: true`. The only state that offers
 *   sign-up.
 * - "closed": the server said `enabled: false`.
 * - "unknown": the check failed (a network error, a 429 from the auth rate
 *   limit, a 5xx while the API restarts). NOT treated as open: offering the
 *   form here is how a closed alpha showed a sign-up form whose submit then
 *   failed too. The register endpoint enforces the flag either way; this only
 *   decides whether to invite a doomed attempt.
 *
 * A failed refetch keeps the last good answer: react-query leaves `data` in
 * place on a background error, and a known answer beats "unknown".
 */
export type RegistrationGate = "pending" | "open" | "closed" | "unknown";

export function registrationGate(query: {
  data: RegistrationStatusResponse | undefined;
  isPending: boolean;
}): RegistrationGate {
  if (query.data) return query.data.enabled ? "open" : "closed";
  return query.isPending ? "pending" : "unknown";
}
