import { activitySignals, db, DEMO_WEEK_START, PEOPLE_IDS, PROJECT_IDS, seedDatabase, weeklyVerifications } from "@resource-verification/database";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "./server";

const WEEK_START = DEMO_WEEK_START;

describe("POST /api/sync", () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  it("succeeds and all 5 people receive persisted weekly verification results", async () => {
    const app = buildServer();
    const response = await app.inject({ method: "POST", url: "/api/sync", payload: { weekStart: WEEK_START } });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.weekStart).toBe(WEEK_START);
    expect(body.peopleAnalyzed).toBe(5);
    expect(body.results).toHaveLength(5);

    const rows = await db.select().from(weeklyVerifications).where(eq(weeklyVerifications.weekStart, WEEK_START));
    expect(rows).toHaveLength(5);
  });

  it("Priya becomes MISMATCH / HIGH / AWAITING_CONFIRMATION", async () => {
    const app = buildServer();
    const response = await app.inject({ method: "POST", url: "/api/sync", payload: { weekStart: WEEK_START } });
    const body = response.json();

    const priya = body.results.find((result: { personId: string }) => result.personId === PEOPLE_IDS.priyaShah);
    expect(priya).toBeDefined();
    expect(priya.analysisStatus).toBe("MISMATCH");
    expect(priya.confidence).toBe("HIGH");
    expect(priya.reviewStatus).toBe("AWAITING_CONFIRMATION");
  });

  it("persists activity signals, matching the reported signalsProcessed count", async () => {
    const app = buildServer();
    const response = await app.inject({ method: "POST", url: "/api/sync", payload: { weekStart: WEEK_START } });
    const body = response.json();
    expect(body.signalsProcessed).toBeGreaterThan(0);

    const rows = await db.select().from(activitySignals).where(eq(activitySignals.weekStart, WEEK_START));
    expect(rows).toHaveLength(body.signalsProcessed);
  });

  it("does not continuously duplicate activity signals on repeated sync", async () => {
    const app = buildServer();
    await app.inject({ method: "POST", url: "/api/sync", payload: { weekStart: WEEK_START } });
    const afterFirst = await db.select().from(activitySignals).where(eq(activitySignals.weekStart, WEEK_START));

    await app.inject({ method: "POST", url: "/api/sync", payload: { weekStart: WEEK_START } });
    const afterSecond = await db.select().from(activitySignals).where(eq(activitySignals.weekStart, WEEK_START));

    expect(afterSecond.length).toBe(afterFirst.length);
  });

  it("does not create duplicate weekly verification records on repeated sync", async () => {
    const app = buildServer();
    await app.inject({ method: "POST", url: "/api/sync", payload: { weekStart: WEEK_START } });
    await app.inject({ method: "POST", url: "/api/sync", payload: { weekStart: WEEK_START } });

    const rows = await db.select().from(weeklyVerifications).where(eq(weeklyVerifications.weekStart, WEEK_START));
    expect(rows).toHaveLength(5);
  });

  it("preserves an existing human review decision across a repeated sync", async () => {
    const app = buildServer();
    await app.inject({ method: "POST", url: "/api/sync", payload: { weekStart: WEEK_START } });

    await app.inject({
      method: "POST",
      url: `/api/employees/${PEOPLE_IDS.priyaShah}/week/correct`,
      payload: {
        weekStart: WEEK_START,
        allocations: [
          { projectId: PROJECT_IDS.atlas, percentage: 30 },
          { projectId: PROJECT_IDS.beacon, percentage: 50 },
          { projectId: PROJECT_IDS.cedar, percentage: 20 },
        ],
        comment: "resync should not reset this",
      },
    });

    const secondSync = await app.inject({ method: "POST", url: "/api/sync", payload: { weekStart: WEEK_START } });
    const priyaSyncResult = secondSync
      .json()
      .results.find((result: { personId: string }) => result.personId === PEOPLE_IDS.priyaShah);
    expect(priyaSyncResult.reviewStatus).toBe("CORRECTED");

    const getResponse = await app.inject({
      method: "GET",
      url: `/api/employees/${PEOPLE_IDS.priyaShah}/week?weekStart=${WEEK_START}`,
    });
    const employeeWeek = getResponse.json();
    expect(employeeWeek.verification.reviewStatus).toBe("CORRECTED");
    expect(employeeWeek.humanReview.decision).toBe("CORRECT");
    expect(employeeWeek.humanReview.correctedAllocations).toHaveLength(3);
  });
});
