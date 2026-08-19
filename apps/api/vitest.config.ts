import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // These are integration tests sharing one Postgres database — running
    // files in parallel would race on seedDatabase()/sync resetting state.
    fileParallelism: false,
  },
});
