import { DEMO_WEEK_START, PEOPLE_IDS, PROJECT_IDS, seedDatabase } from "@resource-verification/database";
import { beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "./server";

const WEEK_START = DEMO_WEEK_START;

describe("GET /api/executive/summary", () => {
  let app: ReturnType<typeof buildServer>;

  beforeEach(async () => {
    await seedDatabase();
    app = buildServer();
    await app.inject({ method: "POST", url: "/api/sync", payload: { weekStart: WEEK_START } });
  });

  it("aggregates current persisted state correctly", async () => {
    const response = await app.inject({ method: "GET", url: `/api/executive/summary?weekStart=${WEEK_START}` });
    const body = response.json();

    expect(body.peopleTracked).toBe(5);
    expect(body.projectsTracked).toBe(3);
    expect(body.mismatchCount).toBe(1);
    expect(body.lowEvidenceCount).toBe(1);
    expect(body.awaitingConfirmationCount).toBe(5);
    expect(body.verifiedCount).toBe(0);
    expect(body.correctedCount).toBe(0);
    expect(body.needsAttention.length).toBeGreaterThan(0);
  });

  it("correctedCount changes when Priya corrects her week", async () => {
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
      },
    });

    const response = await app.inject({ method: "GET", url: `/api/executive/summary?weekStart=${WEEK_START}` });
    expect(response.json().correctedCount).toBe(1);
  });

  it("verifiedCount reflects confirmed + corrected", async () => {
    await app.inject({
      method: "POST",
      url: `/api/employees/${PEOPLE_IDS.mayaChen}/week/confirm`,
      payload: { weekStart: WEEK_START },
    });
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
      },
    });

    const response = await app.inject({ method: "GET", url: `/api/executive/summary?weekStart=${WEEK_START}` });
    const body = response.json();
    expect(body.verifiedCount).toBe(2);
    expect(body.awaitingConfirmationCount).toBe(3);
  });
});
