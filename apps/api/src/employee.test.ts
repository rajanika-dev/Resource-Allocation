import { db, DEMO_WEEK_START, PEOPLE_IDS, plannedAllocations, PROJECT_IDS, seedDatabase } from "@resource-verification/database";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "./server";

const WEEK_START = DEMO_WEEK_START;

const priyaCorrection = {
  weekStart: WEEK_START,
  allocations: [
    { projectId: PROJECT_IDS.atlas, percentage: 30 },
    { projectId: PROJECT_IDS.beacon, percentage: 50 },
    { projectId: PROJECT_IDS.cedar, percentage: 20 },
  ],
  comment: "I spent more time on Project Beacon this week.",
};

describe("Employee Week API", () => {
  let app: ReturnType<typeof buildServer>;

  beforeEach(async () => {
    await seedDatabase();
    app = buildServer();
    await app.inject({ method: "POST", url: "/api/sync", payload: { weekStart: WEEK_START } });
  });

  it("returns planned allocation data", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/employees/${PEOPLE_IDS.priyaShah}/week?weekStart=${WEEK_START}`,
    });
    const body = response.json();

    const atlas = body.plannedDistribution.find((entry: { projectId: string }) => entry.projectId === PROJECT_IDS.atlas);
    const cedar = body.plannedDistribution.find((entry: { projectId: string }) => entry.projectId === PROJECT_IDS.cedar);
    expect(atlas.percentage).toBe(75);
    expect(cedar.percentage).toBe(25);
  });

  it("returns observed activity data", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/employees/${PEOPLE_IDS.priyaShah}/week?weekStart=${WEEK_START}`,
    });
    const body = response.json();

    const beacon = body.observedDistribution.find(
      (entry: { projectId: string }) => entry.projectId === PROJECT_IDS.beacon,
    );
    expect(beacon.percentage).toBeCloseTo(89.13, 0);
  });

  it("returns source evidence grouped by allocation/jira/calendar", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/employees/${PEOPLE_IDS.priyaShah}/week?weekStart=${WEEK_START}`,
    });
    const body = response.json();

    expect(body.evidence.allocation.length).toBeGreaterThan(0);
    expect(body.evidence.jira.length).toBeGreaterThan(0);
    expect(body.evidence.calendar.length).toBeGreaterThan(0);
    expect(body.humanReview).toBeNull();
  });

  it("Confirm persists CONFIRMED", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/employees/${PEOPLE_IDS.mayaChen}/week/confirm`,
      payload: { weekStart: WEEK_START, comment: "Looks correct" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.verification.reviewStatus).toBe("CONFIRMED");
    expect(body.humanReview.decision).toBe("CONFIRM");
  });

  it("Correct persists CORRECTED while preserving the machine analysis", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/employees/${PEOPLE_IDS.priyaShah}/week/correct`,
      payload: priyaCorrection,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.verification.reviewStatus).toBe("CORRECTED");
    expect(body.verification.analysisStatus).toBe("MISMATCH");
    expect(body.verification.confidence).toBe("HIGH");
  });

  it("correction survives a new GET", async () => {
    await app.inject({
      method: "POST",
      url: `/api/employees/${PEOPLE_IDS.priyaShah}/week/correct`,
      payload: priyaCorrection,
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/employees/${PEOPLE_IDS.priyaShah}/week?weekStart=${WEEK_START}`,
    });
    const body = response.json();

    expect(body.verification.reviewStatus).toBe("CORRECTED");
    expect(body.humanReview.correctedAllocations).toHaveLength(3);
    expect(body.humanReview.comment).toBe(priyaCorrection.comment);
  });

  it("correction does not modify the original planned_allocations records", async () => {
    await app.inject({
      method: "POST",
      url: `/api/employees/${PEOPLE_IDS.priyaShah}/week/correct`,
      payload: priyaCorrection,
    });

    const rows = await db
      .select()
      .from(plannedAllocations)
      .where(eq(plannedAllocations.personId, PEOPLE_IDS.priyaShah));
    const atlasRow = rows.find((row) => row.projectId === PROJECT_IDS.atlas);
    expect(Number(atlasRow?.percentage)).toBe(60);

    const response = await app.inject({
      method: "GET",
      url: `/api/employees/${PEOPLE_IDS.priyaShah}/week?weekStart=${WEEK_START}`,
    });
    const plannedAtlas = response
      .json()
      .plannedDistribution.find((entry: { projectId: string }) => entry.projectId === PROJECT_IDS.atlas);
    expect(plannedAtlas.percentage).toBe(75);
  });
});
