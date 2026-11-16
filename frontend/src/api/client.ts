import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./tokenStorage";
import type { TokenPair } from "./types";

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000/api").replace(
  /\/$/,
  "",
);

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: QueryParams;
  /** Send the access token and refresh it when it expires. Defaults to true. */
  auth?: boolean;
  signal?: AbortSignal;
}

/** Error raised for any failed request, with the server's field errors when present. */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function buildUrl(path: string, query: QueryParams = {}): string {
  const url = /^https?:\/\//.test(path) ? path : `${API_URL}${path}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  }
  const search = params.toString();
  return search ? `${url}?${search}` : url;
}

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/** Subscribe to "the session is gone" events. Returns the unsubscribe function. */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function toApiError(status: number, body: unknown): ApiError {
  const fallback = `Request failed with status ${status}.`;
  if (!body || typeof body !== "object") return new ApiError(status, fallback);

  const data = body as Record<string, unknown>;
  if (typeof data.detail === "string") return new ApiError(status, data.detail);

  const fieldErrors: Record<string, string> = {};
  for (const [field, value] of Object.entries(data)) {
    const message = Array.isArray(value) ? value[0] : value;
    if (typeof message === "string") fieldErrors[field] = message;
  }
  const first = Object.values(fieldErrors)[0];
  return new ApiError(status, first ?? fallback, fieldErrors);
}

async function send(path: string, options: RequestOptions, token: string | null) {
  const headers = new Headers({ Accept: "application/json" });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }
}

let refreshInFlight: Promise<boolean> | null = null;

/** Exchange the refresh token for a new pair. Concurrent callers share one request. */
function refreshTokens(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    const refresh = getRefreshToken();
    if (!refresh) return false;
    const response = await send("/auth/refresh/", { method: "POST", body: { refresh } }, null);
    if (!response.ok) return false;
    setTokens((await parseBody(response)) as TokenPair);
    return true;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const auth = options.auth ?? true;
  let response = await send(path, options, auth ? getAccessToken() : null);

  if (response.status === 401 && auth && getRefreshToken()) {
    if (await refreshTokens()) {
      response = await send(path, options, getAccessToken());
    } else {
      clearTokens();
      unauthorizedListeners.forEach((listener) => listener());
    }
  }

  const body = await parseBody(response);
  if (!response.ok) throw toApiError(response.status, body);
  return body as T;
}
