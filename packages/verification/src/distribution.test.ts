import type { ResourceSignal } from "@resource-verification/shared";
import { describe, expect, it } from "vitest";
import { buildDistribution, dominantProject, totalQuantity, totalVariationGap, weightedCombine } from "./distribution";

function signal(overrides: Partial<ResourceSignal>): ResourceSignal {
  return {
    personId: "person-1",
    projectId: "atlas",
    source: "allocation",
    signalType: "declared_allocation",
    quantity: 0,
    weekStart: "2026-08-10",
    evidence: {},
    ...overrides,
  };
}

describe("buildDistribution", () => {
  it("normalizes planned allocation across only assigned projects (SPEC.md section 3)", () => {
    const distribution = buildDistribution([
      signal({ projectId: "atlas", quantity: 60 }),
      signal({ projectId: "cedar", quantity: 20 }),
    ]);

    expect(distribution).toEqual([
      { projectId: "atlas", percentage: 75 },
      { projectId: "cedar", percentage: 25 },
    ]);
  });

  it("computes Jira distribution as each project's share of total activity", () => {
    const distribution = buildDistribution([
      signal({ source: "jira", signalType: "work_activity", projectId: "atlas", quantity: 1 }),
      signal({ source: "jira", signalType: "work_activity", projectId: "beacon", quantity: 9 }),
    ]);

    expect(distribution).toEqual([
      { projectId: "atlas", percentage: 10 },
      { projectId: "beacon", percentage: 90 },
    ]);
  });

  it("computes Calendar distribution as each project's share of total meeting hours", () => {
    const distribution = buildDistribution([
      signal({ source: "calendar", signalType: "meeting_activity", projectId: "atlas", quantity: 1 }),
      signal({ source: "calendar", signalType: "meeting_activity", projectId: "beacon", quantity: 7 }),
    ]);

    expect(distribution).toEqual([
      { projectId: "atlas", percentage: 12.5 },
      { projectId: "beacon", percentage: 87.5 },
    ]);
  });

  it("returns an empty distribution when there is no activity at all", () => {
    expect(buildDistribution([])).toEqual([]);
  });
});

describe("weightedCombine", () => {
  it("combines Jira and Calendar distributions using 65/35 weighting", () => {
    const jira = [
      { projectId: "atlas", percentage: 10 },
      { projectId: "beacon", percentage: 90 },
    ];
    const calendar = [
      { projectId: "atlas", percentage: 12.5 },
      { projectId: "beacon", percentage: 87.5 },
    ];

    const combined = weightedCombine(jira, 0.65, calendar, 0.35);

    expect(combined.find((entry) => entry.projectId === "atlas")?.percentage).toBeCloseTo(10.875, 5);
    expect(combined.find((entry) => entry.projectId === "beacon")?.percentage).toBeCloseTo(89.125, 5);
  });

  it("treats a project missing from one distribution as 0% from that source", () => {
    const jira = [{ projectId: "atlas", percentage: 100 }];
    const calendar = [{ projectId: "beacon", percentage: 100 }];

    const combined = weightedCombine(jira, 0.65, calendar, 0.35);

    expect(combined.find((entry) => entry.projectId === "atlas")?.percentage).toBeCloseTo(65, 5);
    expect(combined.find((entry) => entry.projectId === "beacon")?.percentage).toBeCloseTo(35, 5);
  });
});

describe("totalVariationGap", () => {
  it("computes total variation distance on a 0-100 scale across the union of projects", () => {
    const planned = [
      { projectId: "atlas", percentage: 75 },
      { projectId: "cedar", percentage: 25 },
    ];
    const observed = [
      { projectId: "atlas", percentage: 10.875 },
      { projectId: "beacon", percentage: 89.125 },
    ];

    expect(totalVariationGap(planned, observed)).toBeCloseTo(89.125, 3);
  });

  it("is zero for identical distributions", () => {
    const distribution = [{ projectId: "atlas", percentage: 100 }];
    expect(totalVariationGap(distribution, distribution)).toBe(0);
  });
});

describe("totalQuantity", () => {
  it("sums quantity across signals", () => {
    expect(totalQuantity([signal({ quantity: 3 }), signal({ quantity: 4 })])).toBe(7);
  });

  it("is zero for no signals", () => {
    expect(totalQuantity([])).toBe(0);
  });
});

describe("dominantProject", () => {
  it("returns the project with the highest percentage", () => {
    const distribution = [
      { projectId: "atlas", percentage: 10 },
      { projectId: "beacon", percentage: 90 },
    ];
    expect(dominantProject(distribution)?.projectId).toBe("beacon");
  });

  it("returns undefined for an empty distribution", () => {
    expect(dominantProject([])).toBeUndefined();
  });
});
