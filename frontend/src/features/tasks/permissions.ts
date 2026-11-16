import type { CurrentUser, Task } from "@/api/types";

/** Mirrors the API rule: only the creator or a staff user may delete a task. */
export function canDeleteTask(user: CurrentUser | null, task: Task): boolean {
  return Boolean(user && (user.isStaff || task.createdBy.id === user.id));
}
