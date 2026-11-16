import type { MockInstance } from "vitest";

import * as client from "../client";
import { completeTask, createTask, deleteTask, listTasks, updateTask } from "../tasks";
import type { TaskInput } from "../types";
import { listUsers } from "../users";

const input: TaskInput = {
  title: "Write docs",
  description: "",
  status: "pending",
  priority: "medium",
  dueDate: null,
  assignee: null,
};

describe("tasks api", () => {
  let request: MockInstance<typeof client.apiRequest>;

  beforeEach(() => {
    request = vi.spyOn(client, "apiRequest").mockResolvedValue({});
  });

  it("lists tasks with query parameters", async () => {
    const signal = new AbortController().signal;

    await listTasks({ status: "pending", page: 2 }, signal);

    expect(request).toHaveBeenCalledWith("/tasks/", {
      query: { status: "pending", page: 2 },
      signal,
    });
  });

  it("creates, updates, completes and deletes tasks", async () => {
    await createTask(input);
    await updateTask("t1", { title: "New title" });
    await completeTask("t1");
    await deleteTask("t1");

    expect(request.mock.calls).toEqual([
      ["/tasks/", { method: "POST", body: input }],
      ["/tasks/t1/", { method: "PATCH", body: { title: "New title" } }],
      ["/tasks/t1/complete/", { method: "POST" }],
      ["/tasks/t1/", { method: "DELETE" }],
    ]);
  });

  it("lists users for the assignee picker", async () => {
    request.mockResolvedValueOnce({ results: [{ username: "bob" }] });

    await expect(listUsers()).resolves.toEqual([{ username: "bob" }]);
    expect(request).toHaveBeenCalledWith("/users/", { query: { page_size: 100 }, signal: undefined });
  });
});
