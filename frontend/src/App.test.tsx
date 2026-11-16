import { screen } from "@testing-library/react";

import { makeAuth, renderWithProviders } from "@/test/render";

import App from "./App";

describe("App routes", () => {
  it("shows the login page to anonymous users", () => {
    renderWithProviders(<App />, { auth: makeAuth({ status: "anonymous", user: null }) });

    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows the tasks page to authenticated users", () => {
    renderWithProviders(<App />);

    expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument();
  });

  it("shows a not-found page for unknown URLs", () => {
    renderWithProviders(<App />, { route: "/nope" });

    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to tasks" })).toHaveAttribute("href", "/");
  });
});
