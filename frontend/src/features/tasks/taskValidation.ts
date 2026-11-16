import type { Task, TaskInput, TaskPriority, TaskStatus } from "@/api/types";

/** Form state: every field is a string so inputs stay controlled. */
export interface TaskFormValues {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignee: string;
}

export type TaskFormErrors = Partial<Record<keyof TaskFormValues, string>>;

export const TITLE_MAX_LENGTH = 200;

export const EMPTY_TASK_FORM: TaskFormValues = {
  title: "",
  description: "",
  status: "pending",
  priority: "medium",
  dueDate: "",
  assignee: "",
};

export function taskToFormValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ?? "",
    assignee: task.assignee ?? "",
  };
}

interface ValidationContext {
  /** Today's date as `YYYY-MM-DD`. */
  today: string;
  /** The due date saved on the task being edited; it may stay in the past. */
  originalDueDate?: string | null;
}

/** Mirrors the API rules so most mistakes are caught before a request. */
export function validateTaskForm(
  values: TaskFormValues,
  { today, originalDueDate }: ValidationContext,
): TaskFormErrors {
  const errors: TaskFormErrors = {};
  const title = values.title.trim();
  if (!title) errors.title = "Enter a title.";
  else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = `Use at most ${TITLE_MAX_LENGTH} characters.`;
  }
  if (values.dueDate && values.dueDate !== originalDueDate && values.dueDate < today) {
    errors.dueDate = "The due date cannot be in the past.";
  }
  return errors;
}

export function toTaskInput(values: TaskFormValues): TaskInput {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    status: values.status,
    priority: values.priority,
    dueDate: values.dueDate || null,
    assignee: values.assignee || null,
  };
}
