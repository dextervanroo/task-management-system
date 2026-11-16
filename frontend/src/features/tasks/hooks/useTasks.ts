import { useCallback, useEffect, useState } from "react";

import { listTasks } from "@/api/tasks";
import type { Paginated, Task } from "@/api/types";

import { filtersToQuery, type TaskFilters } from "../taskFilters";

export const PAGE_SIZE = 10;

interface Result {
  /** Which request produced this result; differs from the current one while loading. */
  key: string;
  data: Paginated<Task> | null;
  error: string | null;
}

/** Loads one page of tasks for the given filters; `reload` fetches it again. */
export function useTasks(filters: TaskFilters) {
  const [version, setVersion] = useState(0);
  const query = JSON.stringify(filtersToQuery(filters, PAGE_SIZE));
  const requestKey = `${query}#${version}`;
  const [result, setResult] = useState<Result>({ key: "", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    listTasks(JSON.parse(query), controller.signal)
      .then((data) => setResult({ key: requestKey, data, error: null }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setResult((previous) => ({ key: requestKey, data: previous.data, error: error.message }));
      });
    return () => controller.abort();
  }, [query, requestKey]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  return {
    data: result.data,
    error: result.error,
    loading: result.key !== requestKey,
    reload,
  };
}
