import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";

// A warning in the test console usually means a warning in the browser console:
// fail the test so it gets fixed.
const failOnConsole = (level: "error" | "warn") => (...args: unknown[]) => {
  throw new Error(`console.${level} called during test: ${args.map(String).join(" ")}`);
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(failOnConsole("error"));
  vi.spyOn(console, "warn").mockImplementation(failOnConsole("warn"));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});
