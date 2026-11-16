import { screen } from "@testing-library/react";

import { bob, makeTask } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

import { TaskCard } from "./TaskCard";

const today = "2026-11-16";

describe("TaskCard", () => {
  it("shows the task details", () => {
    const task = makeTask({
      title: "Write docs",
      description: "Setup guide",
      status: "in_progress",
      priority: "high",
      dueDate: "2026-11-18",
      assignee: bob.id,
      assigneeDetail: bob,
    });

    renderWithProviders(<TaskCard task={task} today={today} />);

    const card = screen.getByRole("article", { name: "Write docs" });
    expect(card).toHaveTextContent("In progress");
    expect(card).toHaveTextContent("High priority");
    expect(card).toHaveTextContent("Setup guide");
    expect(card).toHaveTextContent("Due in 2 days");
    expect(card).toHaveTextContent("Bob Brown");
  });

  it("highlights overdue tasks and shows unassigned ones", () => {
    renderWithProviders(
      <TaskCard task={makeTask({ dueDate: "2026-11-14", isOverdue: true })} today={today} />,
    );

    expect(screen.getByText("Overdue by 2 days")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("strikes through completed tasks", () => {
    renderWithProviders(
      <TaskCard task={makeTask({ title: "Done", status: "completed" })} today={today} />,
    );

    expect(screen.getByRole("heading", { name: "Done" })).toHaveStyle({
      textDecoration: "line-through",
    });
  });

  it("renders the given actions", () => {
    renderWithProviders(
      <TaskCard task={makeTask()} today={today} actions={<button>Edit</button>} />,
    );

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });
});
