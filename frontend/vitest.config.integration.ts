import { defineConfig } from "vitest/config";

import { INTEGRATION_SPECS, plugins, resolve, testOptions } from "./vitest.shared";

// `npm run test:integration`: components and pages rendered with their providers.
export default defineConfig({
  plugins,
  resolve,
  test: { ...testOptions, name: "integration", include: [INTEGRATION_SPECS] },
});
