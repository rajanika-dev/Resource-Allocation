import { describe, expect, it } from "vitest";
import { buildReason } from "./reason";

const resolveProjectName = (id: string) =>
  ({ atlas: "Project Atlas", beacon: "Project Beacon" })[id] ?? id;

describe("buildReason", () => {
  it("names the observed and planned dominant projects for MISMATCH, using the supplied resolver", () => {
    const reason = buildReason(
      "MISMATCH",
      [{ projectId: "atlas", percentage: 75 }],
      [{ projectId: "beacon", percentage: 89 }],
      resolveProjectName,
    );

    expect(reason).toContain("Project Beacon");
    expect(reason).toContain("Project Atlas");
  });

  it("returns the fixed LOW_EVIDENCE explanation", () => {
    expect(buildReason("LOW_EVIDENCE", [], [], resolveProjectName)).toMatch(
      /not enough jira or calendar activity/i,
    );
  });

  it("returns the fixed CONSISTENT explanation", () => {
    expect(buildReason("CONSISTENT", [], [], resolveProjectName)).toMatch(/included in the declared allocation/i);
  });
});
