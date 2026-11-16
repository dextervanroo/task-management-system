import { apiRequest, type QueryParams } from "./client";
import type { Paginated, Task, TaskInput } from "./types";

export function listTasks(query: QueryParams = {}, signal?: AbortSignal): Promise<Paginated<Task>> {
  return apiRequest<Paginated<Task>>("/tasks/", { query, signal });
}

export function createTask(input: TaskInput): Promise<Task> {
  return apiRequest<Task>("/tasks/", { method: "POST", body: input });
}

export function updateTask(id: string, input: Partial<TaskInput>): Promise<Task> {
  return apiRequest<Task>(`/tasks/${id}/`, { method: "PATCH", body: input });
}

export function deleteTask(id: string): Promise<void> {
  return apiRequest<void>(`/tasks/${id}/`, { method: "DELETE" });
}

export function completeTask(id: string): Promise<Task> {
  return apiRequest<Task>(`/tasks/${id}/complete/`, { method: "POST" });
}
