import { defineConfig } from "vitest/config";

import { UNIT_SPECS, plugins, resolve, testOptions } from "./vitest.shared";

// `npm run test:unit`: pure helpers, hooks and API modules only.
export default defineConfig({
  plugins,
  resolve,
  test: { ...testOptions, name: "unit", include: [UNIT_SPECS] },
});
