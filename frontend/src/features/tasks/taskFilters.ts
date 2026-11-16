import type { QueryParams } from "@/api/client";
import type { TaskStatus } from "@/api/types";

export type OverdueFilter = "" | "true" | "false";

export interface TaskFilters {
  search: string;
  status: TaskStatus | "";
  dueDateAfter: string;
  dueDateBefore: string;
  overdue: OverdueFilter;
  ordering: string;
  page: number;
}

export const ORDERING_OPTIONS = [
  { value: "-created_at", label: "Newest first" },
  { value: "created_at", label: "Oldest first" },
  { value: "due_date", label: "Due date (soonest)" },
  { value: "-due_date", label: "Due date (latest)" },
  { value: "title", label: "Title (A–Z)" },
] as const;

export const DEFAULT_FILTERS: TaskFilters = {
  search: "",
  status: "",
  dueDateAfter: "",
  dueDateBefore: "",
  overdue: "",
  ordering: "-created_at",
  page: 1,
};

const STATUSES: TaskStatus[] = ["pending", "in_progress", "completed"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Query parameters for GET /tasks/ (the API keeps them in snake_case). */
export function filtersToQuery(filters: TaskFilters, pageSize: number): QueryParams {
  return {
    search: filters.search.trim() || undefined,
    status: filters.status || undefined,
    due_date_after: filters.dueDateAfter || undefined,
    due_date_before: filters.dueDateBefore || undefined,
    overdue: filters.overdue || undefined,
    ordering: filters.ordering,
    page: filters.page,
    page_size: pageSize,
  };
}

/** Read filters from the page URL, dropping anything invalid. */
export function filtersFromSearchParams(params: URLSearchParams): TaskFilters {
  const status = params.get("status") as TaskStatus | null;
  const overdue = params.get("overdue");
  const ordering = params.get("ordering");
  const page = Number(params.get("page"));
  const date = (key: string) => {
    const value = params.get(key) ?? "";
    return ISO_DATE.test(value) ? value : "";
  };
  return {
    search: params.get("search") ?? "",
    status: status && STATUSES.includes(status) ? status : "",
    dueDateAfter: date("due_date_after"),
    dueDateBefore: date("due_date_before"),
    overdue: overdue === "true" || overdue === "false" ? overdue : "",
    ordering: ORDERING_OPTIONS.some((option) => option.value === ordering)
      ? ordering!
      : DEFAULT_FILTERS.ordering,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Write filters to the page URL, leaving defaults out to keep it short. */
export function filtersToSearchParams(filters: TaskFilters): URLSearchParams {
  const entries: [string, string][] = [
    ["search", filters.search],
    ["status", filters.status],
    ["due_date_after", filters.dueDateAfter],
    ["due_date_before", filters.dueDateBefore],
    ["overdue", filters.overdue],
    ["ordering", filters.ordering === DEFAULT_FILTERS.ordering ? "" : filters.ordering],
    ["page", filters.page === 1 ? "" : String(filters.page)],
  ];
  return new URLSearchParams(entries.filter(([, value]) => value !== ""));
}

export function dateRangeError(filters: TaskFilters): string | null {
  const { dueDateAfter, dueDateBefore } = filters;
  if (dueDateAfter && dueDateBefore && dueDateAfter > dueDateBefore) {
    return "The start date must be before the end date.";
  }
  return null;
}

export function hasActiveFilters(filters: TaskFilters): boolean {
  return Boolean(
    filters.search ||
      filters.status ||
      filters.dueDateAfter ||
      filters.dueDateBefore ||
      filters.overdue,
  );
}
