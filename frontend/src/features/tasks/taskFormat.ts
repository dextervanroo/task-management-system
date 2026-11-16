import type { Task, TaskPriority, TaskStatus } from "@/api/types";

type ChipColor = "default" | "info" | "success" | "warning" | "error";

export const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

export const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const STATUS_COLORS: Record<TaskStatus, ChipColor> = {
  pending: "default",
  in_progress: "info",
  completed: "success",
};

const PRIORITY_COLORS: Record<TaskPriority, ChipColor> = {
  low: "default",
  medium: "warning",
  high: "error",
};

export const statusLabel = (status: TaskStatus) =>
  STATUS_OPTIONS.find((option) => option.value === status)!.label;
export const priorityLabel = (priority: TaskPriority) =>
  PRIORITY_OPTIONS.find((option) => option.value === priority)!.label;
export const statusColor = (status: TaskStatus) => STATUS_COLORS[status];
export const priorityColor = (priority: TaskPriority) => PRIORITY_COLORS[priority];

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** Format a `YYYY-MM-DD` date. Parsed as UTC so the day never shifts. */
export function formatDate(isoDate: string): string {
  return DATE_FORMAT.format(new Date(`${isoDate}T00:00:00Z`));
}

/** The local calendar date as `YYYY-MM-DD`. */
export function todayIso(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS);
}

/** Human description of when a task is due, relative to `today`. */
export function describeDueDate(task: Pick<Task, "status" | "dueDate">, today: string): string {
  if (!task.dueDate) return "No due date";
  if (task.status === "completed") return `Due ${formatDate(task.dueDate)}`;

  const days = daysBetween(today, task.dueDate);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 1) return `Due in ${days} days`;
  const late = -days;
  return `Overdue by ${late} day${late === 1 ? "" : "s"}`;
}
