import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as authApi from "@/api/auth";
import * as client from "@/api/client";
import { alice } from "@/test/render";

import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./useAuth";

function Probe() {
  const { status, user, login, logout } = useAuth();
  return (
    <div>
      <p>status: {status}</p>
      <p>user: {user?.username ?? "none"}</p>
      <button onClick={() => void login("alice", "pw")}>login</button>
      <button onClick={() => void logout()}>logout</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

describe("AuthProvider", () => {
  it("starts anonymous without a stored session", () => {
    vi.spyOn(authApi, "hasStoredSession").mockReturnValue(false);

    renderProvider();

    expect(screen.getByText("status: anonymous")).toBeInTheDocument();
  });

  it("restores the user from a stored session", async () => {
    vi.spyOn(authApi, "hasStoredSession").mockReturnValue(true);
    vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(alice);

    renderProvider();

    expect(screen.getByText("status: loading")).toBeInTheDocument();
    expect(await screen.findByText("status: authenticated")).toBeInTheDocument();
    expect(screen.getByText("user: alice")).toBeInTheDocument();
  });

  it("falls back to anonymous when the stored session is invalid", async () => {
    vi.spyOn(authApi, "hasStoredSession").mockReturnValue(true);
    vi.spyOn(authApi, "fetchCurrentUser").mockRejectedValue(new client.ApiError(401, "no"));

    renderProvider();

    expect(await screen.findByText("status: anonymous")).toBeInTheDocument();
  });

  it("logs in and out", async () => {
    vi.spyOn(authApi, "hasStoredSession").mockReturnValue(false);
    const login = vi.spyOn(authApi, "login").mockResolvedValue();
    vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(alice);
    const logout = vi.spyOn(authApi, "logout").mockResolvedValue();
    renderProvider();

    await userEvent.click(screen.getByRole("button", { name: "login" }));
    expect(await screen.findByText("user: alice")).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith("alice", "pw");

    await userEvent.click(screen.getByRole("button", { name: "logout" }));
    expect(await screen.findByText("status: anonymous")).toBeInTheDocument();
    expect(logout).toHaveBeenCalled();
  });

  it("signs the user out when the API reports the session is gone", async () => {
    vi.spyOn(authApi, "hasStoredSession").mockReturnValue(true);
    vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(alice);
    let notify: () => void = () => {};
    vi.spyOn(client, "onUnauthorized").mockImplementation((listener) => {
      notify = listener;
      return () => true;
    });
    renderProvider();
    await screen.findByText("status: authenticated");

    act(() => notify());

    await waitFor(() => expect(screen.getByText("status: anonymous")).toBeInTheDocument());
    expect(screen.getByText("user: none")).toBeInTheDocument();
  });
});

describe("useAuth", () => {
  it("fails loudly outside the provider", () => {
    // React logs the thrown error; silence it for this test only.
    vi.mocked(console.error).mockImplementation(() => {});

    expect(() => render(<Probe />)).toThrow("useAuth must be used inside <AuthProvider>.");
  });
});
