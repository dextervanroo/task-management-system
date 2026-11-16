import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  REFRESH_TOKEN_KEY,
  setTokens,
} from "./tokenStorage";

describe("tokenStorage", () => {
  afterEach(() => clearTokens());

  it("keeps the access token in memory and the refresh token in localStorage", () => {
    setTokens({ access: "access-1", refresh: "refresh-1" });

    expect(getAccessToken()).toBe("access-1");
    expect(getRefreshToken()).toBe("refresh-1");
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("refresh-1");
    expect(JSON.stringify(localStorage)).not.toContain("access-1");
  });

  it("clears both tokens", () => {
    setTokens({ access: "a", refresh: "r" });

    clearTokens();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("reads a refresh token stored by a previous session", () => {
    localStorage.setItem(REFRESH_TOKEN_KEY, "persisted");

    expect(getRefreshToken()).toBe("persisted");
    expect(getAccessToken()).toBeNull();
  });
});
