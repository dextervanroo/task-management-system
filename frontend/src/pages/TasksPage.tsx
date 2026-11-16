import { Alert, Box, Button, Pagination, Skeleton, Stack, Typography } from "@mui/material";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

import { TaskCard } from "@/features/tasks/components/TaskCard";
import { TaskFiltersBar } from "@/features/tasks/components/TaskFiltersBar";
import { useTasks } from "@/features/tasks/hooks/useTasks";
import { todayIso } from "@/features/tasks/taskFormat";
import {
  filtersFromSearchParams,
  filtersToSearchParams,
  hasActiveFilters,
  type TaskFilters,
} from "@/features/tasks/taskFilters";

export default function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const setFilters = useCallback(
    (next: TaskFilters) => setSearchParams(filtersToSearchParams(next)),
    [setSearchParams],
  );
  const { data, loading, error, reload } = useTasks(filters);
  const today = todayIso();

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 2, mb: 3 }}>
        <Typography variant="h4" component="h1">
          Tasks
        </Typography>
        {data && (
          <Typography color="text.secondary" aria-live="polite">
            {data.count} {data.count === 1 ? "task" : "tasks"}
          </Typography>
        )}
      </Box>

      <TaskFiltersBar filters={filters} onChange={setFilters} />

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={reload}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {loading && !data ? (
        <Stack spacing={2} aria-label="Loading tasks">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} variant="rounded" height={120} />
          ))}
        </Stack>
      ) : data && data.results.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
          <Typography variant="h6" component="p">
            {hasActiveFilters(filters) ? "No tasks match these filters." : "No tasks yet."}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2} sx={{ opacity: loading ? 0.6 : 1, transition: "opacity 150ms" }}>
          {data?.results.map((task) => <TaskCard key={task.id} task={task} today={today} />)}
        </Stack>
      )}

      {data && data.totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <Pagination
            count={data.totalPages}
            page={data.currentPage}
            onChange={(_, page) => setFilters({ ...filters, page })}
            color="primary"
            siblingCount={0}
          />
        </Box>
      )}
    </>
  );
}
