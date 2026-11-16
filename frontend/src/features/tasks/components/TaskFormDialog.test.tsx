import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApiError } from "@/api/client";
import * as tasksApi from "@/api/tasks";
import { bob, makeTask } from "@/test/fixtures";
import { alice, renderWithProviders } from "@/test/render";

import { TaskFormDialog } from "./TaskFormDialog";

const users = [alice, bob];

function renderDialog(task?: ReturnType<typeof makeTask>) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  renderWithProviders(
    <TaskFormDialog task={task} users={users} onClose={onClose} onSaved={onSaved} />,
  );
  return { onClose, onSaved };
}

async function choose(label: RegExp, option: string) {
  await userEvent.click(screen.getByRole("combobox", { name: label }));
  await userEvent.click(within(screen.getByRole("listbox")).getByRole("option", { name: option }));
}

describe("TaskFormDialog", () => {
  it("creates a task", async () => {
    const created = makeTask({ title: "Write docs" });
    const create = vi.spyOn(tasksApi, "createTask").mockResolvedValue(created);
    const { onSaved } = renderDialog();
    expect(screen.getByRole("dialog", { name: "New task" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /assignee/i })).toHaveTextContent("Unassigned");

    await userEvent.type(screen.getByLabelText(/title/i), "  Write docs ");
    await userEvent.type(screen.getByLabelText(/description/i), "Setup guide");
    await choose(/priority/i, "High");
    await choose(/assignee/i, "Bob Brown");
    await userEvent.type(screen.getByLabelText(/due date/i), "2099-01-31");
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));

    expect(create).toHaveBeenCalledWith({
      title: "Write docs",
      description: "Setup guide",
      status: "pending",
      priority: "high",
      dueDate: "2099-01-31",
      assignee: bob.id,
    });
    expect(onSaved).toHaveBeenCalledWith(created);
  });

  it("validates before sending", async () => {
    const create = vi.spyOn(tasksApi, "createTask");
    renderDialog();

    await userEvent.type(screen.getByLabelText(/due date/i), "2000-01-01");
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));

    expect(screen.getByText("Enter a title.")).toBeInTheDocument();
    expect(screen.getByText("The due date cannot be in the past.")).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it("edits an existing task with only the form values", async () => {
    const task = makeTask({ title: "Old", status: "pending", assignee: bob.id, assigneeDetail: bob });
    const update = vi.spyOn(tasksApi, "updateTask").mockResolvedValue({ ...task, title: "New" });
    const { onSaved } = renderDialog(task);
    expect(screen.getByRole("dialog", { name: "Edit task" })).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue("Old");

    await userEvent.clear(screen.getByLabelText(/title/i));
    await userEvent.type(screen.getByLabelText(/title/i), "New");
    await choose(/status/i, "In progress");
    await choose(/assignee/i, "Unassigned");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(update).toHaveBeenCalledWith(task.id, expect.objectContaining({
      title: "New",
      status: "in_progress",
      assignee: null,
    }));
    expect(onSaved).toHaveBeenCalled();
  });

  it("allows keeping a past due date when editing", async () => {
    const task = makeTask({ dueDate: "2001-01-01" });
    const update = vi.spyOn(tasksApi, "updateTask").mockResolvedValue(task);
    renderDialog(task);

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(update).toHaveBeenCalled();
  });

  it("shows server-side field errors", async () => {
    vi.spyOn(tasksApi, "createTask").mockRejectedValue(
      new ApiError(400, "Select a valid assignee.", { assignee: "Select a valid assignee." }),
    );
    const { onSaved } = renderDialog();

    await userEvent.type(screen.getByLabelText(/title/i), "Task");
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Select a valid assignee.");
    expect(screen.getAllByText("Select a valid assignee.")).toHaveLength(2);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("shows non-field errors", async () => {
    vi.spyOn(tasksApi, "createTask").mockRejectedValue(new ApiError(0, "Could not reach the server."));
    renderDialog();

    await userEvent.type(screen.getByLabelText(/title/i), "Task");
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the server.");
    expect(screen.getByRole("button", { name: "Create task" })).toBeEnabled();
  });

  it("uses a generic message for unexpected failures", async () => {
    vi.spyOn(tasksApi, "createTask").mockRejectedValue("boom");
    renderDialog();

    await userEvent.type(screen.getByLabelText(/title/i), "Task");
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save the task.");
  });

  it("closes on cancel", async () => {
    const { onClose } = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
  });
});
