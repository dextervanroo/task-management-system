import {
  DEFAULT_FILTERS,
  dateRangeError,
  filtersFromSearchParams,
  filtersToQuery,
  filtersToSearchParams,
  hasActiveFilters,
} from "./taskFilters";

describe("filtersToQuery", () => {
  it("maps filters to the API's snake_case query parameters", () => {
    const query = filtersToQuery(
      {
        ...DEFAULT_FILTERS,
        search: "report",
        status: "pending",
        dueDateAfter: "2026-11-01",
        dueDateBefore: "2026-11-30",
        overdue: "true",
        ordering: "due_date",
        page: 3,
      },
      20,
    );

    expect(query).toEqual({
      search: "report",
      status: "pending",
      due_date_after: "2026-11-01",
      due_date_before: "2026-11-30",
      overdue: "true",
      ordering: "due_date",
      page: 3,
      page_size: 20,
    });
  });

  it("leaves empty filters out", () => {
    expect(filtersToQuery(DEFAULT_FILTERS, 10)).toEqual({
      search: undefined,
      status: undefined,
      due_date_after: undefined,
      due_date_before: undefined,
      overdue: undefined,
      ordering: "-created_at",
      page: 1,
      page_size: 10,
    });
  });
});

describe("URL search params", () => {
  it("round-trips non-default filters", () => {
    const filters = {
      ...DEFAULT_FILTERS,
      search: "docs",
      status: "completed" as const,
      overdue: "false" as const,
      page: 2,
    };

    const params = filtersToSearchParams(filters);

    expect(params.toString()).toBe("search=docs&status=completed&overdue=false&page=2");
    expect(filtersFromSearchParams(params)).toEqual(filters);
  });

  it("ignores invalid values", () => {
    const params = new URLSearchParams(
      "status=archived&overdue=maybe&page=-4&ordering=password&due_date_after=soon",
    );

    expect(filtersFromSearchParams(params)).toEqual(DEFAULT_FILTERS);
  });

  it("reads date ranges", () => {
    const filters = filtersFromSearchParams(
      new URLSearchParams("due_date_after=2026-11-01&due_date_before=2026-11-30"),
    );

    expect([filters.dueDateAfter, filters.dueDateBefore]).toEqual(["2026-11-01", "2026-11-30"]);
  });
});

describe("dateRangeError", () => {
  it("accepts open and ordered ranges", () => {
    expect(dateRangeError(DEFAULT_FILTERS)).toBeNull();
    expect(
      dateRangeError({ ...DEFAULT_FILTERS, dueDateAfter: "2026-11-01", dueDateBefore: "2026-11-01" }),
    ).toBeNull();
  });

  it("rejects a start after the end", () => {
    expect(
      dateRangeError({ ...DEFAULT_FILTERS, dueDateAfter: "2026-12-01", dueDateBefore: "2026-11-01" }),
    ).toBe("The start date must be before the end date.");
  });
});

describe("hasActiveFilters", () => {
  it("ignores page and ordering", () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, page: 4, ordering: "title" })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, status: "pending" })).toBe(true);
  });
});
