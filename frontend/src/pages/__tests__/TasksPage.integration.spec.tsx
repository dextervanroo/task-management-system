import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router";

import * as tasksApi from "@/api/tasks";
import * as usersApi from "@/api/users";
import { bob, makeTask, page } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

import TasksPage from "../TasksPage";

function LocationProbe() {
  return <p data-testid="location">{useLocation().search}</p>;
}

function renderPage(route = "/") {
  return renderWithProviders(
    <Routes>
      <Route
        path="/"
        element={
          <>
            <TasksPage />
            <LocationProbe />
          </>
        }
      />
    </Routes>,
    { route },
  );
}

beforeEach(() => {
  vi.spyOn(usersApi, "listUsers").mockResolvedValue([bob]);
});

describe("TasksPage", () => {
  it("lists tasks with the total count", async () => {
    vi.spyOn(tasksApi, "listTasks").mockResolvedValue(
      page([makeTask({ title: "Write docs" }), makeTask({ title: "Ship it" })]),
    );

    renderPage();

    expect(screen.getByLabelText("Loading tasks")).toBeInTheDocument();
    expect(await screen.findByRole("article", { name: "Write docs" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Ship it" })).toBeInTheDocument();
    expect(screen.getByText("2 tasks")).toBeInTheDocument();
  });

  it("reads the filters from the URL", async () => {
    const list = vi.spyOn(tasksApi, "listTasks").mockResolvedValue(page([makeTask()]));

    renderPage("/?status=completed&page=2&overdue=false");

    await screen.findByText("1 task");
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed", page: 2, overdue: "false" }),
      expect.any(AbortSignal),
    );
  });

  it("writes filter changes to the URL", async () => {
    vi.spyOn(tasksApi, "listTasks").mockResolvedValue(page([]));
    renderPage();
    await screen.findByText("No tasks yet.");

    await userEvent.click(screen.getByRole("combobox", { name: /status/i }));
    await userEvent.click(screen.getByRole("option", { name: "Pending" }));

    expect(screen.getByTestId("location")).toHaveTextContent("?status=pending");
    expect(await screen.findByText("No tasks match these filters.")).toBeInTheDocument();
  });

  it("paginates", async () => {
    vi.spyOn(tasksApi, "listTasks").mockResolvedValue(
      page([makeTask()], { count: 25, totalPages: 3 }),
    );
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Go to page 2" }));

    expect(screen.getByTestId("location")).toHaveTextContent("?page=2");
  });

  it("shows errors with a retry button", async () => {
    const list = vi
      .spyOn(tasksApi, "listTasks")
      .mockRejectedValueOnce(new Error("Could not reach the server."))
      .mockResolvedValueOnce(page([makeTask({ title: "Back online" })]));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the server.");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("article", { name: "Back online" })).toBeInTheDocument();
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  });
});

describe("TasksPage editing", () => {
  it("creates a task and reloads the list", async () => {
    const list = vi
      .spyOn(tasksApi, "listTasks")
      .mockResolvedValueOnce(page([]))
      .mockResolvedValueOnce(page([makeTask({ title: "Fresh task" })]));
    vi.spyOn(tasksApi, "createTask").mockResolvedValue(makeTask({ title: "Fresh task" }));
    renderPage();
    await screen.findByText("No tasks yet.");

    await userEvent.click(screen.getByRole("button", { name: "New task" }));
    await userEvent.type(screen.getByLabelText(/title/i), "Fresh task");
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));

    expect(await screen.findByText("Task created.")).toBeInTheDocument();
    expect(await screen.findByRole("article", { name: "Fresh task" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("edits a task from its card", async () => {
    const task = makeTask({ title: "Draft" });
    vi.spyOn(tasksApi, "listTasks").mockResolvedValue(page([task]));
    const update = vi.spyOn(tasksApi, "updateTask").mockResolvedValue({ ...task, title: "Final" });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Edit Draft" }));
    await userEvent.clear(screen.getByLabelText(/title/i));
    await userEvent.type(screen.getByLabelText(/title/i), "Final");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(update).toHaveBeenCalledWith(task.id, expect.objectContaining({ title: "Final" }));
    expect(await screen.findByText("Task updated.")).toBeInTheDocument();
  });

  it("closes the form without saving", async () => {
    vi.spyOn(tasksApi, "listTasks").mockResolvedValue(page([]));
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "New task" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("TasksPage actions", () => {
  it("completes a task", async () => {
    const task = makeTask({ title: "Ship it" });
    vi.spyOn(tasksApi, "listTasks")
      .mockResolvedValueOnce(page([task]))
      .mockResolvedValueOnce(page([{ ...task, status: "completed" }]));
    const complete = vi
      .spyOn(tasksApi, "completeTask")
      .mockResolvedValue({ ...task, status: "completed" });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Complete Ship it" }));

    expect(complete).toHaveBeenCalledWith(task.id);
    expect(await screen.findByText("Task completed.")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Complete Ship it" })).not.toBeInTheDocument(),
    );
  });

  it("reports failed actions", async () => {
    vi.spyOn(tasksApi, "listTasks").mockResolvedValue(page([makeTask({ title: "Ship it" })]));
    vi.spyOn(tasksApi, "completeTask").mockRejectedValue(new Error("Not found."));
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Complete Ship it" }));

    expect(await screen.findByText("Not found.")).toBeInTheDocument();
  });

  it("uses a generic message for unexpected failures", async () => {
    vi.spyOn(tasksApi, "listTasks").mockResolvedValue(page([makeTask({ title: "Ship it" })]));
    vi.spyOn(tasksApi, "completeTask").mockRejectedValue("boom");
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Complete Ship it" }));

    expect(await screen.findByText("Something went wrong.")).toBeInTheDocument();
  });

  it("deletes a task after confirmation", async () => {
    const task = makeTask({ title: "Old task" });
    vi.spyOn(tasksApi, "listTasks")
      .mockResolvedValueOnce(page([task]))
      .mockResolvedValueOnce(page([]));
    const remove = vi.spyOn(tasksApi, "deleteTask").mockResolvedValue();
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Delete Old task" }));
    const dialog = screen.getByRole("dialog", { name: "Delete task?" });
    expect(dialog).toHaveTextContent('"Old task" will be permanently deleted.');
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(remove).toHaveBeenCalledWith(task.id);
    expect(await screen.findByText("Task deleted.")).toBeInTheDocument();
    expect(await screen.findByText("No tasks yet.")).toBeInTheDocument();
  });

  it("keeps the task when deletion is cancelled", async () => {
    vi.spyOn(tasksApi, "listTasks").mockResolvedValue(page([makeTask({ title: "Keep me" })]));
    const remove = vi.spyOn(tasksApi, "deleteTask");
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Delete Keep me" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(remove).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("only offers deletion to the creator", async () => {
    vi.spyOn(tasksApi, "listTasks").mockResolvedValue(
      page([makeTask({ title: "Bob's task", createdBy: bob })]),
    );
    renderPage();

    await screen.findByRole("article", { name: "Bob's task" });
    expect(screen.queryByRole("button", { name: "Delete Bob's task" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Bob's task" })).toBeInTheDocument();
  });

  it("dismisses notices", async () => {
    vi.spyOn(tasksApi, "listTasks").mockResolvedValue(page([makeTask({ title: "Ship it" })]));
    vi.spyOn(tasksApi, "completeTask").mockRejectedValue(new Error("Not found."));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Complete Ship it" }));

    await userEvent.click(await screen.findByRole("button", { name: "Close" }));

    await waitFor(() => expect(screen.queryByText("Not found.")).not.toBeInTheDocument());
  });
});
