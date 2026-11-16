import type { Task } from "@/api/types";

import {
  describeDueDate,
  formatDate,
  priorityColor,
  priorityLabel,
  statusColor,
  statusLabel,
  todayIso,
} from "../taskFormat";

const task = (overrides: Partial<Task>) => ({ status: "pending", dueDate: null, ...overrides }) as Task;

describe("labels and colors", () => {
  it.each([
    ["pending", "Pending", "default"],
    ["in_progress", "In progress", "info"],
    ["completed", "Completed", "success"],
  ] as const)("status %s", (status, label, color) => {
    expect(statusLabel(status)).toBe(label);
    expect(statusColor(status)).toBe(color);
  });

  it.each([
    ["low", "Low", "default"],
    ["medium", "Medium", "warning"],
    ["high", "High", "error"],
  ] as const)("priority %s", (priority, label, color) => {
    expect(priorityLabel(priority)).toBe(label);
    expect(priorityColor(priority)).toBe(color);
  });
});

describe("formatDate", () => {
  it("formats ISO dates without shifting the day", () => {
    expect(formatDate("2026-12-01")).toBe("Dec 1, 2026");
    expect(formatDate("2026-01-31")).toBe("Jan 31, 2026");
  });
});

describe("todayIso", () => {
  it("returns the local calendar date", () => {
    expect(todayIso(new Date(2026, 10, 5, 23, 59))).toBe("2026-11-05");
  });
});

describe("describeDueDate", () => {
  const today = "2026-11-16";

  it.each([
    [null, "No due date"],
    ["2026-11-16", "Due today"],
    ["2026-11-17", "Due tomorrow"],
    ["2026-11-20", "Due in 4 days"],
    ["2026-11-15", "Overdue by 1 day"],
    ["2026-11-01", "Overdue by 15 days"],
  ])("open task due %s", (dueDate, expected) => {
    expect(describeDueDate(task({ dueDate }), today)).toBe(expected);
  });

  it("shows the plain date for completed tasks", () => {
    expect(describeDueDate(task({ status: "completed", dueDate: "2026-11-01" }), today)).toBe(
      "Due Nov 1, 2026",
    );
  });

  it("handles completed tasks without a due date", () => {
    expect(describeDueDate(task({ status: "completed" }), today)).toBe("No due date");
  });
});
