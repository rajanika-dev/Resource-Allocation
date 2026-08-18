import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** Resolved from this file's own location so it works regardless of invocation cwd. */
export const DEMO_DATA_DIR = resolve(here, "../../../demo-data");
