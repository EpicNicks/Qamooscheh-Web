import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as contactsApi from "../api/contacts";
import { chunk, hashEmail, MATCH_MAX_HASHES } from "../domain/contacts";
import type { ContactMatchResponse } from "../types/api";

const findableKey = ["contacts", "findable"] as const;

export function useContactsFindable() {
  return useQuery({ queryKey: findableKey, queryFn: contactsApi.getContactsFindable });
}

export function useSetContactsFindable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (findable: boolean) => contactsApi.setContactsFindable(findable),
    onSuccess: (next) => queryClient.setQueryData(findableKey, next),
  });
}

/** Hashes in the browser, then matches in calls of at most 500; stops at the first failure. */
export async function matchEmails(emails: string[]): Promise<ContactMatchResponse[]> {
  const hashes = await Promise.all(emails.map(hashEmail));
  const byUser = new Map<string, ContactMatchResponse>();
  for (const batch of chunk(hashes, MATCH_MAX_HASHES)) {
    for (const match of (await contactsApi.matchContacts(batch)).matches) byUser.set(match.userId, match);
  }
  // The server sorts each call by display name; re-sort so batches don't interleave.
  return [...byUser.values()].sort((a, b) => a.displayName.localeCompare(b.displayName) || a.userId.localeCompare(b.userId));
}

/** Not cached: a result is a one-off lookup and the body is sensitive. */
export function useMatchContacts() {
  return useMutation({ mutationFn: matchEmails });
}
