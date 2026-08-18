import { describe, expect, it } from "vitest";
import { combineObservedDistribution } from "./combineObservedDistribution";

describe("combineObservedDistribution", () => {
  const jira = [
    { projectId: "atlas", percentage: 20 },
    { projectId: "beacon", percentage: 80 },
  ];
  const calendar = [
    { projectId: "atlas", percentage: 40 },
    { projectId: "beacon", percentage: 60 },
  ];

  it("uses Jira alone, renormalized, when only Jira has meaningful evidence", () => {
    expect(combineObservedDistribution(jira, true, calendar, false)).toEqual(jira);
  });

  it("uses Calendar alone, renormalized, when only Calendar has meaningful evidence", () => {
    expect(combineObservedDistribution(jira, false, calendar, true)).toEqual(calendar);
  });

  it("combines both sources with 65/35 weighting when both are meaningful", () => {
    const result = combineObservedDistribution(jira, true, calendar, true);

    expect(result.find((entry) => entry.projectId === "atlas")?.percentage).toBeCloseTo(20 * 0.65 + 40 * 0.35, 5);
    expect(result.find((entry) => entry.projectId === "beacon")?.percentage).toBeCloseTo(80 * 0.65 + 60 * 0.35, 5);
  });
});
