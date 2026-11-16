import EventIcon from "@mui/icons-material/Event";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import { Box, Card, CardActions, CardContent, Chip, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

import type { Task } from "@/api/types";

import {
  describeDueDate,
  priorityColor,
  priorityLabel,
  statusColor,
  statusLabel,
} from "../taskFormat";

interface Props {
  task: Task;
  today: string;
  actions?: ReactNode;
}

export function TaskCard({ task, today, actions }: Props) {
  const completed = task.status === "completed";

  return (
    <Card component="article" variant="outlined" aria-label={task.title}>
      <CardContent sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap", rowGap: 1 }}>
          <Chip size="small" label={statusLabel(task.status)} color={statusColor(task.status)} />
          <Chip
            size="small"
            variant="outlined"
            label={`${priorityLabel(task.priority)} priority`}
            color={priorityColor(task.priority)}
          />
        </Stack>
        <Typography
          variant="h6"
          component="h2"
          sx={{
            textDecoration: completed ? "line-through" : "none",
            color: completed ? "text.secondary" : "text.primary",
            overflowWrap: "anywhere",
          }}
        >
          {task.title}
        </Typography>
        {task.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: "pre-line" }}>
            {task.description}
          </Typography>
        )}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            columnGap: 3,
            rowGap: 0.5,
            mt: 1.5,
            color: "text.secondary",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              color: task.isOverdue ? "error.main" : "inherit",
              fontWeight: task.isOverdue ? 600 : 400,
            }}
          >
            <EventIcon fontSize="small" aria-hidden />
            {describeDueDate(task, today)}
          </Typography>
          <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <PersonOutlinedIcon fontSize="small" aria-hidden />
            {task.assigneeDetail ? task.assigneeDetail.fullName : "Unassigned"}
          </Typography>
        </Box>
      </CardContent>
      {actions && <CardActions sx={{ justifyContent: "flex-end", pt: 0 }}>{actions}</CardActions>}
    </Card>
  );
}
