import { useEffect, useState } from "react";

import type { User } from "@/api/types";
import { listUsers } from "@/api/users";

/** Users that can be picked as assignees. Errors leave the list empty. */
export function useUsers(): User[] {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    listUsers(controller.signal)
      .then(setUsers)
      .catch(() => {
        if (!controller.signal.aborted) setUsers([]);
      });
    return () => controller.abort();
  }, []);

  return users;
}
