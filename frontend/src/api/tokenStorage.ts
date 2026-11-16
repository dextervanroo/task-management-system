import type { TokenPair } from "./types";

/**
 * The access token lives only in memory, so a script that reads localStorage
 * cannot steal it. The refresh token is kept in localStorage so the session
 * survives a page reload; it is rotated on every refresh and blacklisted on logout.
 */
export const REFRESH_TOKEN_KEY = "tms.refreshToken";

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens({ access, refresh }: TokenPair): void {
  accessToken = access;
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens(): void {
  accessToken = null;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
