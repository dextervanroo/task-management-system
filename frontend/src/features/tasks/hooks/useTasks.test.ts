import { act, renderHook, waitFor } from "@testing-library/react";

import * as tasksApi from "@/api/tasks";
import * as usersApi from "@/api/users";
import { bob, makeTask, page } from "@/test/fixtures";

import { DEFAULT_FILTERS } from "../taskFilters";
import { PAGE_SIZE, useTasks } from "./useTasks";
import { useUsers } from "./useUsers";

describe("useTasks", () => {
  it("loads tasks for the filters", async () => {
    const list = vi.spyOn(tasksApi, "listTasks").mockResolvedValue(page([makeTask()]));

    const { result } = renderHook(() => useTasks({ ...DEFAULT_FILTERS, status: "pending" }));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.count).toBe(1);
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending", page: 1, page_size: PAGE_SIZE }),
      expect.any(AbortSignal),
    );
  });

  it("keeps the previous page and reports errors", async () => {
    const list = vi
      .spyOn(tasksApi, "listTasks")
      .mockResolvedValueOnce(page([makeTask()]))
      .mockRejectedValueOnce(new Error("Server down"));
    const { result } = renderHook(() => useTasks(DEFAULT_FILTERS));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.reload());

    await waitFor(() => expect(result.current.error).toBe("Server down"));
    expect(result.current.data?.count).toBe(1);
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("aborts the previous request when the filters change", async () => {
    const signals: AbortSignal[] = [];
    vi.spyOn(tasksApi, "listTasks").mockImplementation((_, signal) => {
      signals.push(signal!);
      return new Promise((resolve, reject) => {
        signal!.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        setTimeout(() => resolve(page([])), 10);
      });
    });
    const { result, rerender } = renderHook((filters) => useTasks(filters), {
      initialProps: DEFAULT_FILTERS,
    });

    rerender({ ...DEFAULT_FILTERS, page: 2 });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(signals[0].aborted).toBe(true);
    expect(result.current.error).toBeNull();
  });
});

describe("useUsers", () => {
  it("loads the users", async () => {
    vi.spyOn(usersApi, "listUsers").mockResolvedValue([bob]);

    const { result } = renderHook(() => useUsers());

    await waitFor(() => expect(result.current).toEqual([bob]));
  });

  it("falls back to an empty list on errors", async () => {
    const list = vi.spyOn(usersApi, "listUsers").mockRejectedValue(new Error("nope"));

    const { result } = renderHook(() => useUsers());

    await waitFor(() => expect(list).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });
});
