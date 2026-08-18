import { readFileSync } from "node:fs";

/** Reads a file and parses it as a JSON array, failing clearly if it cannot. */
export function readJsonArray(filePath: string): unknown[] {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch (error) {
    throw new Error(`Could not read demo source file "${filePath}": ${(error as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`"${filePath}" is not valid JSON: ${(error as Error).message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`"${filePath}" must contain a JSON array at the top level`);
  }

  return parsed;
}
