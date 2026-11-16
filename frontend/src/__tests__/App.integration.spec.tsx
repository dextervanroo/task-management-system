import { screen } from "@testing-library/react";

import * as tasksApi from "@/api/tasks";
import * as usersApi from "@/api/users";
import { page } from "@/test/fixtures";
import { makeAuth, renderWithProviders } from "@/test/render";

import App from "../App";

beforeEach(() => {
  vi.spyOn(tasksApi, "listTasks").mockResolvedValue(page([]));
  vi.spyOn(usersApi, "listUsers").mockResolvedValue([]);
});

describe("App routes", () => {
  it("shows the login page to anonymous users", () => {
    renderWithProviders(<App />, { auth: makeAuth({ status: "anonymous", user: null }) });

    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows the tasks page to authenticated users", async () => {
    renderWithProviders(<App />);

    expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument();
    expect(await screen.findByText("No tasks yet.")).toBeInTheDocument();
  });

  it("shows a not-found page for unknown URLs", () => {
    renderWithProviders(<App />, { route: "/nope" });

    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to tasks" })).toHaveAttribute("href", "/");
  });
});
