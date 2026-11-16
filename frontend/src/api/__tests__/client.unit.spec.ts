import { ApiError, apiRequest, buildUrl, onUnauthorized } from "../client";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "../tokenStorage";

const API = "http://localhost:8000/api";

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const fetchMock = vi.fn<typeof fetch>();

function failure(promise: Promise<unknown>): Promise<ApiError> {
  return promise.then(
    () => {
      throw new Error("Expected the request to fail");
    },
    (error: ApiError) => error,
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  clearTokens();
});

afterEach(() => vi.unstubAllGlobals());

describe("buildUrl", () => {
  it("joins the base URL, path and non-empty query parameters", () => {
    const url = buildUrl("/tasks/", { status: "pending", page: 2, search: "", overdue: undefined });

    expect(url).toBe(`${API}/tasks/?status=pending&page=2`);
  });

  it("keeps absolute URLs untouched", () => {
    expect(buildUrl("https://other.example.com/x")).toBe("https://other.example.com/x");
  });
});

describe("apiRequest", () => {
  it("sends JSON with the access token and parses the response", async () => {
    setTokens({ access: "token-1", refresh: "refresh-1" });
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: "1" }));

    const result = await apiRequest<{ id: string }>("/tasks/", {
      method: "POST",
      body: { title: "New" },
    });

    expect(result).toEqual({ id: "1" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API}/tasks/`);
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ title: "New" }));
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer token-1");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("returns undefined for 204 responses", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(apiRequest("/tasks/1/", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("omits the Authorization header for anonymous requests", async () => {
    setTokens({ access: "token-1", refresh: "refresh-1" });
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));

    await apiRequest("/auth/login/", { method: "POST", body: {}, auth: false });

    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).has("Authorization")).toBe(false);
  });

  it("raises ApiError with the server detail message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(403, { detail: "Not allowed." }));

    const error = await failure(apiRequest("/tasks/1/", { method: "DELETE" }));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(403);
    expect(error.message).toBe("Not allowed.");
  });

  it("exposes field errors from validation responses", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(400, { title: ["This field is required."] }));

    const error = await failure(apiRequest("/tasks/", { method: "POST", body: {} }));

    expect(error.fieldErrors).toEqual({ title: "This field is required." });
    expect(error.message).toBe("This field is required.");
  });

  it("uses a generic message when the body is not JSON", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html>", { status: 502 }));

    const error = await failure(apiRequest("/tasks/"));

    expect(error.message).toBe("Request failed with status 502.");
  });

  it("reports network failures as ApiError with status 0", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const error = await failure(apiRequest("/tasks/"));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.message).toMatch(/could not reach the server/i);
  });

  it("refreshes an expired access token once and retries", async () => {
    setTokens({ access: "expired", refresh: "refresh-1" });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { detail: "Token expired" }))
      .mockResolvedValueOnce(jsonResponse(200, { access: "fresh", refresh: "refresh-2" }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    await expect(apiRequest("/tasks/")).resolves.toEqual({ ok: true });

    expect(fetchMock.mock.calls[1][0]).toBe(`${API}/auth/refresh/`);
    expect(fetchMock.mock.calls[1][1]?.body).toBe(JSON.stringify({ refresh: "refresh-1" }));
    expect(new Headers(fetchMock.mock.calls[2][1]?.headers).get("Authorization")).toBe(
      "Bearer fresh",
    );
    expect(getAccessToken()).toBe("fresh");
    expect(getRefreshToken()).toBe("refresh-2");
  });

  it("shares a single refresh between concurrent requests", async () => {
    setTokens({ access: "expired", refresh: "refresh-1" });
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh/")) {
        return jsonResponse(200, { access: "fresh", refresh: "refresh-2" });
      }
      const authorized = new Headers(init?.headers).get("Authorization") === "Bearer fresh";
      return authorized ? jsonResponse(200, { url }) : jsonResponse(401, {});
    });

    await Promise.all([apiRequest("/tasks/"), apiRequest("/users/")]);

    const refreshCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/refresh/"));
    expect(refreshCalls).toHaveLength(1);
  });

  it("clears the session and notifies listeners when the refresh fails", async () => {
    setTokens({ access: "expired", refresh: "revoked" });
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(401, { detail: "Token is blacklisted" }));

    const error = await failure(apiRequest("/tasks/"));

    expect(error.status).toBe(401);
    expect(getRefreshToken()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("restores the session before the first request instead of failing with 401", async () => {
    localStorage.setItem("tms.refreshToken", "stored-refresh");
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { access: "fresh", refresh: "refresh-2" }))
      .mockResolvedValueOnce(jsonResponse(200, { username: "alice" }));

    await expect(apiRequest("/users/me/")).resolves.toEqual({ username: "alice" });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${API}/auth/refresh/`,
      `${API}/users/me/`,
    ]);
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get("Authorization")).toBe(
      "Bearer fresh",
    );
  });

  it("ends the session when the stored refresh token is no longer valid", async () => {
    localStorage.setItem("tms.refreshToken", "revoked");
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { detail: "Token is blacklisted" }))
      .mockResolvedValueOnce(jsonResponse(401, { detail: "No credentials" }));

    const error = await failure(apiRequest("/users/me/"));

    expect(error.status).toBe(401);
    expect(getRefreshToken()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("does not try to refresh without a refresh token", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { detail: "No credentials" }));

    const error = await failure(apiRequest("/tasks/"));

    expect(error.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
