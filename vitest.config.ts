import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts rather than merged into it: the suite
// covers domain/ only — pure TypeScript with no JSX and no DOM — so it needs
// neither the react plugin nor a browser-like environment, and the app's
// build config stays free of any test-tooling import.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
