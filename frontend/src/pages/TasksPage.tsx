import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import {
  Alert,
  Box,
  Button,
  Pagination,
  Skeleton,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import type { Task } from "@/api/types";
import { TaskCard } from "@/features/tasks/components/TaskCard";
import { TaskFiltersBar } from "@/features/tasks/components/TaskFiltersBar";
import { TaskFormDialog } from "@/features/tasks/components/TaskFormDialog";
import { useTasks } from "@/features/tasks/hooks/useTasks";
import { useUsers } from "@/features/tasks/hooks/useUsers";
import { todayIso } from "@/features/tasks/taskFormat";
import {
  filtersFromSearchParams,
  filtersToSearchParams,
  hasActiveFilters,
  type TaskFilters,
} from "@/features/tasks/taskFilters";

interface Notice {
  message: string;
  severity: "success" | "error";
}

/** "new" opens an empty form; a task opens it for editing. */
type FormState = "new" | Task | null;

export default function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const setFilters = useCallback(
    (next: TaskFilters) => setSearchParams(filtersToSearchParams(next)),
    [setSearchParams],
  );
  const { data, loading, error, reload } = useTasks(filters);
  const users = useUsers();
  const [form, setForm] = useState<FormState>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const today = todayIso();

  function handleSaved() {
    setNotice({ message: form === "new" ? "Task created." : "Task updated.", severity: "success" });
    setForm(null);
    reload();
  }

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <Typography variant="h4" component="h1">
          Tasks
        </Typography>
        {data && (
          <Typography color="text.secondary" aria-live="polite" sx={{ flexGrow: 1 }}>
            {data.count} {data.count === 1 ? "task" : "tasks"}
          </Typography>
        )}
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setForm("new")}
          sx={{ ml: "auto" }}
        >
          New task
        </Button>
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
          {data?.results.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              today={today}
              actions={
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => setForm(task)}
                  aria-label={`Edit ${task.title}`}
                >
                  Edit
                </Button>
              }
            />
          ))}
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

      {form && (
        <TaskFormDialog
          task={form === "new" ? undefined : form}
          users={users}
          onClose={() => setForm(null)}
          onSaved={handleSaved}
        />
      )}

      <Snackbar
        open={notice !== null}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {notice ? (
          <Alert severity={notice.severity} variant="filled" onClose={() => setNotice(null)}>
            {notice.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  );
}
