import { DEMO_WEEK_START, PEOPLE_IDS, PROJECT_IDS, seedDatabase } from "@resource-verification/database";
import { beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "./server";

const WEEK_START = DEMO_WEEK_START;

describe("GET /api/manager/exceptions", () => {
  let app: ReturnType<typeof buildServer>;

  beforeEach(async () => {
    await seedDatabase();
    app = buildServer();
    await app.inject({ method: "POST", url: "/api/sync", payload: { weekStart: WEEK_START } });
  });

  it("returns all 5 demo people", async () => {
    const response = await app.inject({ method: "GET", url: `/api/manager/exceptions?weekStart=${WEEK_START}` });
    const body = response.json();

    expect(body.people).toHaveLength(5);
    expect(body.summary.peopleTracked).toBe(5);
  });

  it("summary counts current states correctly", async () => {
    const response = await app.inject({ method: "GET", url: `/api/manager/exceptions?weekStart=${WEEK_START}` });
    const body = response.json();

    expect(body.summary.mismatch).toBe(1);
    expect(body.summary.lowEvidence).toBe(1);
    expect(body.summary.awaitingConfirmation).toBe(5);
    expect(body.summary.confirmed).toBe(0);
    expect(body.summary.corrected).toBe(0);
  });

  it("reflects CONFIRMED/CORRECTED decisions", async () => {
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

    const response = await app.inject({ method: "GET", url: `/api/manager/exceptions?weekStart=${WEEK_START}` });
    const body = response.json();

    expect(body.summary.confirmed).toBe(1);
    expect(body.summary.corrected).toBe(1);
    expect(body.summary.awaitingConfirmation).toBe(3);

    const priya = body.people.find((person: { personId: string }) => person.personId === PEOPLE_IDS.priyaShah);
    expect(priya.reviewStatus).toBe("CORRECTED");
    expect(priya.analysisStatus).toBe("MISMATCH");
  });

  it("supports the manager detail endpoint by reusing the Employee Week response", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/manager/people/${PEOPLE_IDS.priyaShah}/week?weekStart=${WEEK_START}`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().verification.analysisStatus).toBe("MISMATCH");
  });
});
