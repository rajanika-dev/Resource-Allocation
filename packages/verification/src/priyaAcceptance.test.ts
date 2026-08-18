import {
  loadIdentityMaps,
  MockAllocationConnector,
  MockCalendarConnector,
  MockJiraConnector,
  normalizeAllocations,
  normalizeCalendarActivity,
  normalizeJiraActivity,
} from "@resource-verification/connectors";
import { DEMO_WEEK_START, PEOPLE_IDS, PROJECT_IDS } from "@resource-verification/database";
import type { ResourceSignal } from "@resource-verification/shared";
import { describe, expect, it } from "vitest";
import { runVerificationEngine } from "./engine";

describe("Priya acceptance case (SPEC.md section 7 / Task 3 section 11)", () => {
  it("produces MISMATCH/HIGH from the current demo dataset, with no special-casing of her ID", async () => {
    const maps = await loadIdentityMaps();
    const [rawAllocations, rawJira, rawCalendar] = await Promise.all([
      new MockAllocationConnector().fetchAllocations(DEMO_WEEK_START),
      new MockJiraConnector().fetchActivity(DEMO_WEEK_START),
      new MockCalendarConnector().fetchActivity(DEMO_WEEK_START),
    ]);

    const signals: ResourceSignal[] = [
      ...normalizeAllocations(rawAllocations, maps),
      ...normalizeJiraActivity(rawJira, maps),
      ...normalizeCalendarActivity(rawCalendar, maps),
    ];

    // Run the engine over every demo person's signals — Priya's result is
    // simply whichever one happens to have her personId, not a special path.
    const results = runVerificationEngine(signals);
    const priya = results.find((result) => result.personId === PEOPLE_IDS.priyaShah);

    expect(priya).toBeDefined();
    expect(priya?.status).toBe("MISMATCH");
    expect(priya?.confidence).toBe("HIGH");

    const plannedAtlas = priya?.plannedDistribution.find((entry) => entry.projectId === PROJECT_IDS.atlas)
      ?.percentage;
    const plannedCedar = priya?.plannedDistribution.find((entry) => entry.projectId === PROJECT_IDS.cedar)
      ?.percentage;
    expect(plannedAtlas).toBeCloseTo(75, 1);
    expect(plannedCedar).toBeCloseTo(25, 1);

    const observedBeacon = priya?.observedDistribution.find((entry) => entry.projectId === PROJECT_IDS.beacon)
      ?.percentage;
    const observedAtlas = priya?.observedDistribution.find((entry) => entry.projectId === PROJECT_IDS.atlas)
      ?.percentage;
    expect(observedBeacon).toBeCloseTo(89.125, 1);
    expect(observedAtlas).toBeCloseTo(10.875, 1);
  });
});
