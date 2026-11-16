import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import { Box, Button, InputAdornment, MenuItem, TextField } from "@mui/material";
import { useEffect, useState } from "react";

import { STATUS_OPTIONS } from "../taskFormat";
import {
  DEFAULT_FILTERS,
  ORDERING_OPTIONS,
  dateRangeError,
  hasActiveFilters,
  type TaskFilters,
} from "../taskFilters";

interface Props {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
}

const SEARCH_DELAY_MS = 300;

/** Show the "all" option's text instead of an empty box when nothing is selected. */
const EMPTY_OPTION_VISIBLE = { select: { displayEmpty: true }, inputLabel: { shrink: true } };

export function TaskFiltersBar({ filters, onChange }: Props) {
  const [search, setSearch] = useState(filters.search);
  const rangeError = dateRangeError(filters);

  // Keep the box in sync when filters change elsewhere (e.g. "Clear filters").
  const [previousSearch, setPreviousSearch] = useState(filters.search);
  if (filters.search !== previousSearch) {
    setPreviousSearch(filters.search);
    setSearch(filters.search);
  }

  // Wait until the user stops typing before searching.
  useEffect(() => {
    if (search === filters.search) return;
    const timer = setTimeout(() => onChange({ ...filters, search, page: 1 }), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search, filters, onChange]);

  const update = (changes: Partial<TaskFilters>) => onChange({ ...filters, ...changes, page: 1 });

  return (
    <Box
      component="section"
      aria-label="Task filters"
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
        mb: 3,
      }}
    >
      <TextField
        label="Search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        sx={{ gridColumn: { md: "span 2" } }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
      />
      <TextField
        select
        label="Sort by"
        value={filters.ordering}
        onChange={(event) => update({ ordering: event.target.value })}
      >
        {ORDERING_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Status"
        slotProps={EMPTY_OPTION_VISIBLE}
        value={filters.status}
        onChange={(event) => update({ status: event.target.value as TaskFilters["status"] })}
      >
        <MenuItem value="">All statuses</MenuItem>
        {STATUS_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Overdue"
        slotProps={EMPTY_OPTION_VISIBLE}
        value={filters.overdue}
        onChange={(event) => update({ overdue: event.target.value as TaskFilters["overdue"] })}
      >
        <MenuItem value="">Any</MenuItem>
        <MenuItem value="true">Only overdue</MenuItem>
        <MenuItem value="false">Not overdue</MenuItem>
      </TextField>
      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          label="Due from"
          type="date"
          fullWidth
          value={filters.dueDateAfter}
          onChange={(event) => update({ dueDateAfter: event.target.value })}
          error={Boolean(rangeError)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="Due until"
          type="date"
          fullWidth
          value={filters.dueDateBefore}
          onChange={(event) => update({ dueDateBefore: event.target.value })}
          error={Boolean(rangeError)}
          helperText={rangeError ?? undefined}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Box>
      {hasActiveFilters(filters) && (
        <Box sx={{ gridColumn: "1 / -1" }}>
          <Button
            startIcon={<ClearIcon />}
            onClick={() => onChange({ ...DEFAULT_FILTERS, ordering: filters.ordering })}
          >
            Clear filters
          </Button>
        </Box>
      )}
    </Box>
  );
}
