import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { Button } from "@mui/material";

import type { Task } from "@/api/types";

interface Props {
  task: Task;
  canDelete: boolean;
  busy: boolean;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TaskActions({ task, canDelete, busy, onComplete, onEdit, onDelete }: Props) {
  return (
    <>
      {task.status !== "completed" && (
        <Button
          size="small"
          color="success"
          startIcon={<CheckCircleIcon />}
          onClick={onComplete}
          loading={busy}
          aria-label={`Complete ${task.title}`}
        >
          Complete
        </Button>
      )}
      <Button
        size="small"
        startIcon={<EditIcon />}
        onClick={onEdit}
        disabled={busy}
        aria-label={`Edit ${task.title}`}
      >
        Edit
      </Button>
      {canDelete && (
        <Button
          size="small"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={onDelete}
          disabled={busy}
          aria-label={`Delete ${task.title}`}
        >
          Delete
        </Button>
      )}
    </>
  );
}
