import { apiRequest } from "./client";
import { clearTokens, getRefreshToken, setTokens } from "./tokenStorage";
import type { CurrentUser, TokenPair } from "./types";

export async function login(username: string, password: string): Promise<void> {
  const tokens = await apiRequest<TokenPair>("/auth/login/", {
    method: "POST",
    body: { username, password },
    auth: false,
  });
  setTokens(tokens);
}

/** Blacklist the refresh token on the server, then forget both tokens locally. */
export async function logout(): Promise<void> {
  const refresh = getRefreshToken();
  try {
    if (refresh) {
      await apiRequest("/auth/logout/", { method: "POST", body: { refresh }, auth: false });
    }
  } catch {
    // The local session is cleared anyway; an expired token is already unusable.
  } finally {
    clearTokens();
  }
}

export function fetchCurrentUser(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/users/me/");
}

export function hasStoredSession(): boolean {
  return getRefreshToken() !== null;
}
