import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/render";

import { DEFAULT_FILTERS, type TaskFilters } from "../taskFilters";
import { TaskFiltersBar } from "./TaskFiltersBar";

function renderBar(filters: TaskFilters = { ...DEFAULT_FILTERS, page: 3 }) {
  const onChange = vi.fn();
  const view = renderWithProviders(<TaskFiltersBar filters={filters} onChange={onChange} />);
  return { onChange, ...view };
}

async function choose(label: RegExp, option: string) {
  await userEvent.click(screen.getByRole("combobox", { name: label }));
  await userEvent.click(within(screen.getByRole("listbox")).getByRole("option", { name: option }));
}

describe("TaskFiltersBar", () => {
  it("filters by status and resets to the first page", async () => {
    const { onChange } = renderBar();

    await choose(/status/i, "Completed");

    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_FILTERS, status: "completed", page: 1 });
  });

  it("filters overdue tasks", async () => {
    const { onChange } = renderBar();

    await choose(/overdue/i, "Only overdue");

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ overdue: "true" }));
  });

  it("changes the ordering", async () => {
    const { onChange } = renderBar();

    await choose(/sort by/i, "Due date (soonest)");

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ ordering: "due_date" }));
  });

  it("sets the due date range", async () => {
    const { onChange } = renderBar();

    await userEvent.type(screen.getByLabelText(/due from/i), "2026-11-01");
    await userEvent.type(screen.getByLabelText(/due until/i), "2026-11-30");

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ dueDateAfter: "2026-11-01" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ dueDateBefore: "2026-11-30" }));
  });

  it("explains an inverted date range", () => {
    renderBar({ ...DEFAULT_FILTERS, dueDateAfter: "2026-12-01", dueDateBefore: "2026-11-01" });

    expect(screen.getByText("The start date must be before the end date.")).toBeInTheDocument();
  });

  it("searches once the user stops typing", async () => {
    const { onChange } = renderBar();

    await userEvent.type(screen.getByLabelText(/search/i), "report");

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_FILTERS, search: "report", page: 1 }),
    );
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("clears the active filters but keeps the ordering", async () => {
    const { onChange } = renderBar({
      ...DEFAULT_FILTERS,
      status: "pending",
      search: "docs",
      ordering: "title",
    });

    await userEvent.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_FILTERS, ordering: "title" });
  });

  it("syncs the search box when filters are reset elsewhere", () => {
    const { rerender } = renderBar({ ...DEFAULT_FILTERS, search: "docs" });
    expect(screen.getByLabelText(/search/i)).toHaveValue("docs");

    rerender(<TaskFiltersBar filters={DEFAULT_FILTERS} onChange={vi.fn()} />);

    expect(screen.getByLabelText(/search/i)).toHaveValue("");
  });

  it("hides the clear button without active filters", () => {
    renderBar();

    expect(screen.queryByRole("button", { name: /clear filters/i })).not.toBeInTheDocument();
  });
});
