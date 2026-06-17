import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use worker threads rather than child-process forks: threads start faster and
    // avoid the fork-pool IPC startup timeout. Per-file `@vitest-environment` still applies.
    pool: "threads",
  },
});
