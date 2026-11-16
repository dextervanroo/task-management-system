/**
 * Settings shared by vite.config.ts (all tests) and the per-suite Vitest configs.
 *
 * Tests live in a `__tests__/` folder next to the code they cover:
 * - `*.unit.spec.ts`: pure helpers, hooks and API modules (no component rendering).
 * - `*.integration.spec.tsx`: components and pages rendered with their providers.
 */
import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import type { ViteUserConfig } from "vitest/config";

export const UNIT_SPECS = "src/**/__tests__/*.unit.spec.{ts,tsx}";
export const INTEGRATION_SPECS = "src/**/__tests__/*.integration.spec.{ts,tsx}";

export const plugins = [react()];

export const resolve = {
  alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
};

export const testOptions = {
  globals: true,
  environment: "jsdom",
  setupFiles: ["./src/test/setup.ts"],
  css: false,
  restoreMocks: true,
} satisfies ViteUserConfig["test"];
