export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

export interface CurrentUser extends User {
  isStaff: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignee: string | null;
  assigneeDetail: User | null;
  createdBy: User;
  completedAt: string | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Fields accepted when creating or updating a task. */
export interface TaskInput {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignee: string | null;
}

export interface Paginated<T> {
  count: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface TokenPair {
  access: string;
  refresh: string;
}
