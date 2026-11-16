import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";

import { renderWithProviders } from "@/test/render";

import { AppLayout } from "./AppLayout";

describe("AppLayout", () => {
  function renderLayout() {
    return renderWithProviders(
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<p>page content</p>} />
        </Route>
      </Routes>,
    );
  }

  it("shows the app title, the current user and the page", () => {
    renderLayout();

    expect(screen.getByText("Task Manager")).toBeInTheDocument();
    expect(screen.getByTestId("current-user")).toHaveTextContent("Alice Anderson");
    expect(screen.getByText("page content")).toBeInTheDocument();
  });

  it("logs out", async () => {
    const { auth } = renderLayout();

    await userEvent.click(screen.getByRole("button", { name: /log out/i }));

    expect(auth.logout).toHaveBeenCalled();
  });
});
