import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

function collectCoreSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return collectCoreSourceFiles(fullPath);
    if (!entry.name.endsWith(".ts")) return [];
    // demo.ts is a runner that legitimately prints real names; the engine itself must not.
    if (entry.name.endsWith(".test.ts") || entry.name === "demo.ts") return [];
    return [fullPath];
  });
}

describe("core verification engine has no person-specific business rules", () => {
  it("never references a demo person's name anywhere in the core engine source", () => {
    const demoPersonNames = ["priya", "shah", "maya", "chen", "jordan", "lee", "marcus", "reed", "elena", "garcia"];

    for (const file of collectCoreSourceFiles(here)) {
      const content = readFileSync(file, "utf-8").toLowerCase();
      for (const name of demoPersonNames) {
        expect(content, `${file} should not reference "${name}"`).not.toContain(name);
      }
    }
  });
});
