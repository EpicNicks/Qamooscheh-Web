import { useQuery } from "@tanstack/react-query";
import { getRegistrationStatus } from "../api/auth";

/**
 * GET /v1/auth/registration-status. Anonymous on purpose (Login/Register are
 * the one place a visitor might have no session at all), so this can't go
 * through the same hooks that assume a bootstrapped, authenticated app.
 *
 * A short staleTime rather than Infinity: this flag exists specifically to
 * be flipped without a redeploy (the alpha-gate use case), so a visitor who
 * leaves a login tab open should see it change within a few minutes rather
 * than needing a hard refresh for the rest of the session.
 */
export function useRegistrationStatus() {
  return useQuery({
    queryKey: ["registrationStatus"],
    queryFn: getRegistrationStatus,
    staleTime: 5 * 60_000,
  });
}
