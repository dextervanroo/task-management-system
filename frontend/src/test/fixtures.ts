import type { Paginated, Task, User } from "@/api/types";

import { alice } from "./render";

export const bob: User = {
  id: "22222222-2222-2222-2222-222222222222",
  username: "bob",
  email: "bob@example.com",
  firstName: "Bob",
  lastName: "Brown",
  fullName: "Bob Brown",
};

let sequence = 0;

export function makeTask(overrides: Partial<Task> = {}): Task {
  sequence += 1;
  return {
    id: `task-${sequence}`,
    title: `Task ${sequence}`,
    description: "",
    status: "pending",
    priority: "medium",
    dueDate: null,
    assignee: null,
    assigneeDetail: null,
    createdBy: alice,
    completedAt: null,
    isOverdue: false,
    createdAt: "2026-11-10T10:00:00Z",
    updatedAt: "2026-11-10T10:00:00Z",
    ...overrides,
  };
}

export function page<T>(results: T[], overrides: Partial<Paginated<T>> = {}): Paginated<T> {
  return {
    count: results.length,
    totalPages: 1,
    currentPage: 1,
    pageSize: 10,
    next: null,
    previous: null,
    results,
    ...overrides,
  };
}
