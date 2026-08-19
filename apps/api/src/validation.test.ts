import { DEMO_WEEK_START, PEOPLE_IDS, PROJECT_IDS, seedDatabase } from "@resource-verification/database";
import { beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "./server";

const WEEK_START = DEMO_WEEK_START;
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

describe("Validation", () => {
  let app: ReturnType<typeof buildServer>;

  beforeEach(async () => {
    await seedDatabase();
    app = buildServer();
    await app.inject({ method: "POST", url: "/api/sync", payload: { weekStart: WEEK_START } });
  });

  it("fails clearly for an unknown employee", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/employees/${UNKNOWN_ID}/week?weekStart=${WEEK_START}`,
    });
    expect(response.statusCode).toBe(404);
  });

  it("fails clearly for a malformed employee id", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/employees/not-a-uuid/week?weekStart=${WEEK_START}`,
    });
    expect(response.statusCode).toBe(404);
  });

  it("fails clearly for an unknown project in a correction", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/employees/${PEOPLE_IDS.priyaShah}/week/correct`,
      payload: { weekStart: WEEK_START, allocations: [{ projectId: UNKNOWN_ID, percentage: 50 }] },
    });
    expect(response.statusCode).toBe(400);
  });

  it("fails clearly for a duplicate project in a correction", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/employees/${PEOPLE_IDS.priyaShah}/week/correct`,
      payload: {
        weekStart: WEEK_START,
        allocations: [
          { projectId: PROJECT_IDS.atlas, percentage: 50 },
          { projectId: PROJECT_IDS.atlas, percentage: 50 },
        ],
      },
    });
    expect(response.statusCode).toBe(400);
  });

  it("fails clearly for a percentage <= 0", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/employees/${PEOPLE_IDS.priyaShah}/week/correct`,
      payload: { weekStart: WEEK_START, allocations: [{ projectId: PROJECT_IDS.atlas, percentage: 0 }] },
    });
    expect(response.statusCode).toBe(400);
  });

  it("fails clearly for a percentage > 100", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/employees/${PEOPLE_IDS.priyaShah}/week/correct`,
      payload: { weekStart: WEEK_START, allocations: [{ projectId: PROJECT_IDS.atlas, percentage: 150 }] },
    });
    expect(response.statusCode).toBe(400);
  });

  it("fails clearly when the total corrected allocation exceeds 100", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/employees/${PEOPLE_IDS.priyaShah}/week/correct`,
      payload: {
        weekStart: WEEK_START,
        allocations: [
          { projectId: PROJECT_IDS.atlas, percentage: 80 },
          { projectId: PROJECT_IDS.beacon, percentage: 40 },
        ],
      },
    });
    expect(response.statusCode).toBe(400);
  });

  it("fails clearly for a malformed weekStart", async () => {
    const response = await app.inject({ method: "GET", url: "/api/executive/summary?weekStart=not-a-date" });
    expect(response.statusCode).toBe(400);
  });

  it("fails clearly when no verification exists for the requested week", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/employees/${PEOPLE_IDS.priyaShah}/week?weekStart=2020-01-01`,
    });
    expect(response.statusCode).toBe(404);
  });
});
