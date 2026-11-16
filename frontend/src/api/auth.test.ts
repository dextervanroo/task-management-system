import { fetchCurrentUser, hasStoredSession, login, logout } from "./auth";
import * as client from "./client";
import { ApiError } from "./client";
import { getAccessToken, getRefreshToken, setTokens } from "./tokenStorage";

describe("auth api", () => {
  it("stores the tokens returned by login", async () => {
    const request = vi
      .spyOn(client, "apiRequest")
      .mockResolvedValueOnce({ access: "a1", refresh: "r1" });

    await login("alice", "secret");

    expect(request).toHaveBeenCalledWith("/auth/login/", {
      method: "POST",
      body: { username: "alice", password: "secret" },
      auth: false,
    });
    expect(getAccessToken()).toBe("a1");
    expect(hasStoredSession()).toBe(true);
  });

  it("blacklists the refresh token on logout", async () => {
    setTokens({ access: "a1", refresh: "r1" });
    const request = vi.spyOn(client, "apiRequest").mockResolvedValueOnce(undefined);

    await logout();

    expect(request).toHaveBeenCalledWith("/auth/logout/", {
      method: "POST",
      body: { refresh: "r1" },
      auth: false,
    });
    expect(getRefreshToken()).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it("clears the local session even if the server rejects the logout", async () => {
    setTokens({ access: "a1", refresh: "expired" });
    vi.spyOn(client, "apiRequest").mockRejectedValueOnce(new ApiError(401, "expired"));

    await logout();

    expect(hasStoredSession()).toBe(false);
  });

  it("skips the server call when there is no session", async () => {
    const request = vi.spyOn(client, "apiRequest");

    await logout();

    expect(request).not.toHaveBeenCalled();
  });

  it("fetches the current user", async () => {
    const request = vi.spyOn(client, "apiRequest").mockResolvedValueOnce({ username: "alice" });

    await expect(fetchCurrentUser()).resolves.toEqual({ username: "alice" });
    expect(request).toHaveBeenCalledWith("/users/me/");
  });
});
