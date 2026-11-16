import { defineConfig } from "vitest/config";

import { INTEGRATION_SPECS, UNIT_SPECS, plugins, resolve, testOptions } from "./vitest.shared";

export default defineConfig({
  plugins,
  resolve,
  build: {
    rolldownOptions: {
      output: {
        // Long-lived vendor chunks: app changes do not invalidate the cached libraries.
        advancedChunks: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ },
            { name: "mui", test: /node_modules[\\/](@mui|@emotion)[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  // `npm test` / `npm run test:coverage`: both suites, with the coverage gate.
  test: {
    ...testOptions,
    include: [UNIT_SPECS, INTEGRATION_SPECS],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx", "src/**/__tests__/**", "src/test/**", "src/**/*.d.ts"],
      reporter: ["text", "html"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
