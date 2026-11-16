import type { Task } from "@/api/types";

import {
  EMPTY_TASK_FORM,
  taskToFormValues,
  toTaskInput,
  validateTaskForm,
  type TaskFormValues,
} from "./taskValidation";

const today = "2026-11-16";
const values = (overrides: Partial<TaskFormValues> = {}): TaskFormValues => ({
  ...EMPTY_TASK_FORM,
  title: "Write docs",
  ...overrides,
});

describe("validateTaskForm", () => {
  it("accepts a valid form", () => {
    expect(validateTaskForm(values({ dueDate: today }), { today })).toEqual({});
  });

  it.each([
    ["", "Enter a title."],
    ["   ", "Enter a title."],
    ["x".repeat(201), "Use at most 200 characters."],
  ])("validates the title %#", (title, message) => {
    expect(validateTaskForm(values({ title }), { today }).title).toBe(message);
  });

  it("rejects a due date in the past", () => {
    expect(validateTaskForm(values({ dueDate: "2026-11-15" }), { today }).dueDate).toBe(
      "The due date cannot be in the past.",
    );
  });

  it("keeps an existing past due date when editing", () => {
    const errors = validateTaskForm(values({ dueDate: "2026-11-01" }), {
      today,
      originalDueDate: "2026-11-01",
    });

    expect(errors).toEqual({});
  });
});

describe("toTaskInput", () => {
  it("trims text and turns empty choices into null", () => {
    expect(toTaskInput(values({ title: "  Docs ", description: "  more  " }))).toEqual({
      title: "Docs",
      description: "more",
      status: "pending",
      priority: "medium",
      dueDate: null,
      assignee: null,
    });
  });

  it("keeps the due date and assignee", () => {
    const input = toTaskInput(values({ dueDate: "2026-12-01", assignee: "u1" }));

    expect([input.dueDate, input.assignee]).toEqual(["2026-12-01", "u1"]);
  });
});

describe("taskToFormValues", () => {
  it("copies the editable fields", () => {
    const task = {
      title: "T",
      description: "D",
      status: "in_progress",
      priority: "high",
      dueDate: null,
      assignee: "u2",
    } as Task;

    expect(taskToFormValues(task)).toEqual({
      title: "T",
      description: "D",
      status: "in_progress",
      priority: "high",
      dueDate: "",
      assignee: "u2",
    });
  });

  it("uses empty strings for missing values", () => {
    const task = { ...EMPTY_TASK_FORM, title: "T", dueDate: "2026-01-01", assignee: null } as unknown as Task;

    expect(taskToFormValues(task).assignee).toBe("");
  });
});
