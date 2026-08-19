import { DEMO_WEEK_START } from "@resource-verification/database";
import { ValidationError } from "./errors";

const WEEK_START_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Resolves a `weekStart` value from a request (query or body), defaulting to
 * the project's demo week when omitted (Task 4 section 5) and validating the
 * format when provided.
 */
export function resolveWeekStart(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return DEMO_WEEK_START;
  }
  if (typeof value !== "string" || !WEEK_START_PATTERN.test(value)) {
    throw new ValidationError(`weekStart must be a date in YYYY-MM-DD format, received: ${JSON.stringify(value)}`);
  }
  return value;
}
