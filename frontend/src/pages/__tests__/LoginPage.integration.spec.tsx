import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";

import { ApiError } from "@/api/client";
import { makeAuth, renderWithProviders } from "@/test/render";

import LoginPage from "../LoginPage";

function renderLogin(auth = makeAuth({ status: "anonymous", user: null })) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<p>tasks page</p>} />
    </Routes>,
    { route: "/login", auth },
  );
}

async function fillAndSubmit(username: string, password: string) {
  if (username) await userEvent.type(screen.getByLabelText(/username/i), username);
  if (password) await userEvent.type(screen.getByLabelText(/password/i), password);
  await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
}

describe("LoginPage", () => {
  it("requires both fields", async () => {
    const { auth } = renderLogin();

    await fillAndSubmit("", "");

    expect(screen.getByText("Enter your username.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it("logs in and goes to the tasks page", async () => {
    const { auth } = renderLogin();

    await fillAndSubmit(" alice ", "demo1234");

    expect(auth.login).toHaveBeenCalledWith("alice", "demo1234");
    expect(await screen.findByText("tasks page")).toBeInTheDocument();
  });

  it("shows a friendly message for wrong credentials", async () => {
    const login = vi.fn().mockRejectedValue(new ApiError(401, "No active account"));
    renderLogin(makeAuth({ status: "anonymous", user: null, login }));

    await fillAndSubmit("alice", "wrong");

    expect(await screen.findByRole("alert")).toHaveTextContent("Wrong username or password.");
  });

  it("shows the server message for other errors", async () => {
    const login = vi.fn().mockRejectedValue(new ApiError(429, "Request was throttled."));
    renderLogin(makeAuth({ status: "anonymous", user: null, login }));

    await fillAndSubmit("alice", "pw");

    expect(await screen.findByRole("alert")).toHaveTextContent("Request was throttled.");
  });

  it("falls back to a generic message for unknown errors", async () => {
    const login = vi.fn().mockRejectedValue("boom");
    renderLogin(makeAuth({ status: "anonymous", user: null, login }));

    await fillAndSubmit("alice", "pw");

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not log in.");
  });

  it("does not reveal any account credentials", () => {
    renderLogin();

    expect(screen.queryByText(/demo1234|admin123/)).not.toBeInTheDocument();
  });

  it("redirects users who are already logged in", () => {
    renderLogin(makeAuth());

    expect(screen.getByText("tasks page")).toBeInTheDocument();
  });
});
