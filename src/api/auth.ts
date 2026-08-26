// v1/auth — Auth/AuthController.cs. [AllowAnonymous]: every call here passes
// `anonymous: true` so httpClient never attaches a (possibly stale) bearer
// token or tries to refresh on a 401 from these endpoints.
import { apiFetch } from "./httpClient";
import type { AuthResponse } from "../types/api";

export function register(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/v1/auth/register", {
    method: "POST",
    body: { email, password },
    anonymous: true,
  });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/v1/auth/login", {
    method: "POST",
    body: { email, password },
    anonymous: true,
  });
}

export function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/v1/auth/google", {
    method: "POST",
    body: { idToken },
    anonymous: true,
  });
}

export function refresh(refreshToken: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/v1/auth/refresh", {
    method: "POST",
    body: { refreshToken },
    anonymous: true,
  });
}

export function logout(refreshToken: string): Promise<void> {
  return apiFetch<void>("/v1/auth/logout", {
    method: "POST",
    body: { refreshToken },
    anonymous: true,
  });
}
