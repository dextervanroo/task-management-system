import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useState, type FormEvent } from "react";

import { ApiError } from "@/api/client";
import { createTask, updateTask } from "@/api/tasks";
import type { Task, User } from "@/api/types";

import { PRIORITY_OPTIONS, STATUS_OPTIONS, todayIso } from "../taskFormat";
import {
  EMPTY_TASK_FORM,
  TITLE_MAX_LENGTH,
  taskToFormValues,
  toTaskInput,
  validateTaskForm,
  type TaskFormErrors,
  type TaskFormValues,
} from "../taskValidation";

interface Props {
  /** The task to edit; omit to create a new one. */
  task?: Task;
  users: User[];
  onClose: () => void;
  onSaved: (task: Task) => void;
}

/** Create or edit a task. Mount it only while open so the form starts fresh. */
export function TaskFormDialog({ task, users, onClose, onSaved }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [values, setValues] = useState<TaskFormValues>(
    task ? taskToFormValues(task) : EMPTY_TASK_FORM,
  );
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const today = todayIso();

  const field = (name: keyof TaskFormValues) => ({
    name,
    value: values[name],
    onChange: (event: { target: { value: string } }) =>
      setValues((previous) => ({ ...previous, [name]: event.target.value })),
    error: Boolean(errors[name]),
    helperText: errors[name],
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateTaskForm(values, { today, originalDueDate: task?.dueDate });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setFormError(null);
    try {
      const input = toTaskInput(values);
      onSaved(task ? await updateTask(task.id, input) : await createTask(input));
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        setErrors(error.fieldErrors as TaskFormErrors);
      }
      setFormError(error instanceof Error ? error.message : "Could not save the task.");
      setSaving(false);
    }
  }

  const title = task ? "Edit task" : "New task";

  return (
    <Dialog
      open
      onClose={saving ? undefined : onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      aria-labelledby="task-form-title"
    >
      <Box component="form" noValidate onSubmit={handleSubmit}>
        <DialogTitle id="task-form-title">{title}</DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <TextField
            {...field("title")}
            label="Title"
            required
            fullWidth
            autoFocus
            margin="dense"
            slotProps={{ htmlInput: { maxLength: TITLE_MAX_LENGTH } }}
          />
          <TextField
            {...field("description")}
            label="Description"
            fullWidth
            multiline
            minRows={3}
            margin="dense"
          />
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              mt: 1,
            }}
          >
            <TextField {...field("status")} select label="Status">
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField {...field("priority")} select label="Priority">
              {PRIORITY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              {...field("dueDate")}
              label="Due date"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField {...field("assignee")} select label="Assignee">
              <MenuItem value="">Unassigned</MenuItem>
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.fullName}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={saving}>
            {task ? "Save changes" : "Create task"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
