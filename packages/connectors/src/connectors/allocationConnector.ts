import { resolve } from "node:path";
import { DEMO_DATA_DIR } from "../paths";
import { readJsonArray } from "../readJsonArray";
import type { RawAllocation } from "../types/rawAllocation";

export interface AllocationConnector {
  fetchAllocations(weekStart: string): Promise<RawAllocation[]>;
}

const DEFAULT_ALLOCATIONS_FILE = resolve(DEMO_DATA_DIR, "allocations.json");

/**
 * Validates and narrows one parsed JSON item to RawAllocation, throwing a
 * clear, specific error for the first structural problem found.
 */
export function parseRawAllocation(value: unknown, index: number): RawAllocation {
  if (typeof value !== "object" || value === null) {
    throw new Error(`allocations[${index}] must be an object`);
  }
  const record = value as Record<string, unknown>;

  if (typeof record.employeeEmail !== "string" || record.employeeEmail.length === 0) {
    throw new Error(`allocations[${index}].employeeEmail must be a non-empty string`);
  }
  if (typeof record.projectCode !== "string" || record.projectCode.length === 0) {
    throw new Error(`allocations[${index}].projectCode must be a non-empty string`);
  }
  if (typeof record.allocationPercent !== "number" || Number.isNaN(record.allocationPercent)) {
    throw new Error(`allocations[${index}].allocationPercent must be a number`);
  }
  if (typeof record.validFrom !== "string" || record.validFrom.length === 0) {
    throw new Error(`allocations[${index}].validFrom must be a non-empty string`);
  }
  if (record.validTo !== null && typeof record.validTo !== "string") {
    throw new Error(`allocations[${index}].validTo must be a string or null`);
  }
  if (typeof record.week !== "string" || record.week.length === 0) {
    throw new Error(`allocations[${index}].week must be a non-empty string`);
  }

  return record as unknown as RawAllocation;
}

export function parseRawAllocations(items: unknown[]): RawAllocation[] {
  return items.map((item, index) => parseRawAllocation(item, index));
}

/** Reads demo-data/allocations.json. Contains no inference or verification logic. */
export class MockAllocationConnector implements AllocationConnector {
  constructor(private readonly filePath: string = DEFAULT_ALLOCATIONS_FILE) {}

  async fetchAllocations(weekStart: string): Promise<RawAllocation[]> {
    const raw = readJsonArray(this.filePath);
    const allocations = parseRawAllocations(raw);
    return allocations.filter((allocation) => allocation.week === weekStart);
  }
}
