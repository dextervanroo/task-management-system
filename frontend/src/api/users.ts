import { apiRequest } from "./client";
import type { Paginated, User } from "./types";

/** Active users that can receive tasks (first 100, enough for an assignee picker). */
export async function listUsers(signal?: AbortSignal): Promise<User[]> {
  const page = await apiRequest<Paginated<User>>("/users/", {
    query: { page_size: 100 },
    signal,
  });
  return page.results;
}
