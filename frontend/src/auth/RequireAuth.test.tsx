import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router";

import { makeAuth, renderWithProviders } from "@/test/render";

import { RequireAuth } from "./RequireAuth";

function renderGuard(status: "loading" | "authenticated" | "anonymous") {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<p>login page</p>} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<p>private page</p>} />
      </Route>
    </Routes>,
    { auth: makeAuth({ status }) },
  );
}

describe("RequireAuth", () => {
  it("shows a spinner while the session loads", () => {
    renderGuard("loading");

    expect(screen.getByRole("progressbar", { name: "Loading session" })).toBeInTheDocument();
  });

  it("renders the private page for authenticated users", () => {
    renderGuard("authenticated");

    expect(screen.getByText("private page")).toBeInTheDocument();
  });

  it("redirects anonymous users to the login page", () => {
    renderGuard("anonymous");

    expect(screen.getByText("login page")).toBeInTheDocument();
  });
});
