// v1/username — UsernameController.cs (API_SPEC.md §2.6 "Usernames and friend search").
import { apiFetch } from "./httpClient";
import type { UsernameResponse } from "../types/api";

export function getUsername(): Promise<UsernameResponse> {
  return apiFetch<UsernameResponse>("/v1/username");
}

/** 400 reason invalid|reserved; 409 reason taken|held|cooldown (+ canChangeAt). */
export function setUsername(username: string): Promise<UsernameResponse> {
  return apiFetch<UsernameResponse>("/v1/username", { method: "PUT", body: { username } });
}
