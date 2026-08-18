import { DEMO_WEEK_START } from "@resource-verification/database";
import { describe, expect, it } from "vitest";
import { MockAllocationConnector, parseRawAllocations } from "./allocationConnector";

describe("MockAllocationConnector", () => {
  it("loads allocation data independently for the demo week", async () => {
    const connector = new MockAllocationConnector();
    const allocations = await connector.fetchAllocations(DEMO_WEEK_START);

    expect(allocations.length).toBeGreaterThan(0);
    for (const allocation of allocations) {
      expect(typeof allocation.employeeEmail).toBe("string");
      expect(typeof allocation.projectCode).toBe("string");
      expect(typeof allocation.allocationPercent).toBe("number");
      expect(allocation.week).toBe(DEMO_WEEK_START);
    }
  });

  it("returns nothing for a week with no data", async () => {
    const connector = new MockAllocationConnector();
    const allocations = await connector.fetchAllocations("1999-01-01");
    expect(allocations).toEqual([]);
  });
});

describe("parseRawAllocations", () => {
  it("fails clearly when a required field is missing", () => {
    expect(() => parseRawAllocations([{ employeeEmail: "x@example.test" }])).toThrow(/projectCode/);
  });

  it("fails clearly when allocationPercent is not a number", () => {
    expect(() =>
      parseRawAllocations([
        {
          employeeEmail: "x@example.test",
          projectCode: "ATLAS",
          allocationPercent: "sixty",
          validFrom: "2026-08-10",
          validTo: null,
          week: "2026-08-10",
        },
      ]),
    ).toThrow(/allocationPercent/);
  });

  it("fails clearly when the input is not an array of objects", () => {
    expect(() => parseRawAllocations([null])).toThrow(/must be an object/);
  });
});
