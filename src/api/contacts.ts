// v1/contacts — ContactsController.cs (API_SPEC.md §2.6 "Contacts matching").
import { apiFetch } from "./httpClient";
import type { ContactMatchResponse, ContactsFindableResponse } from "../types/api";

export function getContactsFindable(): Promise<ContactsFindableResponse> {
  return apiFetch<ContactsFindableResponse>("/v1/contacts/findable");
}

export function setContactsFindable(findable: boolean): Promise<ContactsFindableResponse> {
  return apiFetch<ContactsFindableResponse>("/v1/contacts/findable", { method: "PUT", body: { findable } });
}

/** 1-500 SHA-256 hex hashes per call; 429 over the hourly call or daily hash allowance. */
export function matchContacts(hashes: string[]): Promise<{ matches: ContactMatchResponse[] }> {
  return apiFetch<{ matches: ContactMatchResponse[] }>("/v1/contacts/match", { method: "POST", body: { hashes } });
}
