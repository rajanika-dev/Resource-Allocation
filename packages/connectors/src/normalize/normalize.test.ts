import { DEMO_WEEK_START, PEOPLE_IDS, PROJECT_IDS } from "@resource-verification/database";
import { beforeAll, describe, expect, it } from "vitest";
import { MockAllocationConnector, MockCalendarConnector, MockJiraConnector } from "../connectors";
import { type IdentityMaps, loadIdentityMaps } from "../identity";
import { normalizeAllocations } from "./normalizeAllocations";
import { normalizeCalendarActivity } from "./normalizeCalendarActivity";
import { normalizeJiraActivity } from "./normalizeJiraActivity";

describe("normalization", () => {
  let maps: IdentityMaps;

  beforeAll(async () => {
    maps = await loadIdentityMaps();
  });

  it("normalizes allocations into declared_allocation signals", async () => {
    const raw = await new MockAllocationConnector().fetchAllocations(DEMO_WEEK_START);
    const signals = normalizeAllocations(raw, maps);

    expect(signals.length).toBe(raw.length);
    for (const signal of signals) {
      expect(signal.source).toBe("allocation");
      expect(signal.signalType).toBe("declared_allocation");
    }
  });

  it("normalizes Jira activity into work_activity signals", async () => {
    const raw = await new MockJiraConnector().fetchActivity(DEMO_WEEK_START);
    const signals = normalizeJiraActivity(raw, maps);

    expect(signals.length).toBe(raw.length);
    for (const signal of signals) {
      expect(signal.source).toBe("jira");
      expect(signal.signalType).toBe("work_activity");
    }
  });

  it("normalizes calendar activity into meeting_activity signals", async () => {
    const raw = await new MockCalendarConnector().fetchActivity(DEMO_WEEK_START);
    const signals = normalizeCalendarActivity(raw, maps);

    expect(signals.length).toBe(raw.length);
    for (const signal of signals) {
      expect(signal.source).toBe("calendar");
      expect(signal.signalType).toBe("meeting_activity");
    }
  });

  it("resolves fake emails/project codes to the stable people.id / projects.id rows from Task 1's seed", async () => {
    const raw = await new MockAllocationConnector().fetchAllocations(DEMO_WEEK_START);
    const signals = normalizeAllocations(raw, maps);

    const priyaAtlas = signals.find(
      (signal) => signal.personId === PEOPLE_IDS.priyaShah && signal.projectId === PROJECT_IDS.atlas,
    );
    expect(priyaAtlas).toBeDefined();
    expect(priyaAtlas?.quantity).toBe(60);

    // Nothing in a normalized signal should carry a human-readable name.
    for (const signal of signals) {
      expect(signal.personId).not.toBe("Priya Shah");
      expect(signal.projectId).not.toBe("Project Atlas");
    }
  });

  it("produces the expected Priya signals across Atlas, Beacon and Cedar", async () => {
    const [rawAllocations, rawJira, rawCalendar] = await Promise.all([
      new MockAllocationConnector().fetchAllocations(DEMO_WEEK_START),
      new MockJiraConnector().fetchActivity(DEMO_WEEK_START),
      new MockCalendarConnector().fetchActivity(DEMO_WEEK_START),
    ]);

    const signals = [
      ...normalizeAllocations(rawAllocations, maps),
      ...normalizeJiraActivity(rawJira, maps),
      ...normalizeCalendarActivity(rawCalendar, maps),
    ];

    const priyaSignals = signals.filter((signal) => signal.personId === PEOPLE_IDS.priyaShah);

    const quantityFor = (source: string, projectId: string) =>
      priyaSignals.find((signal) => signal.source === source && signal.projectId === projectId)?.quantity;

    expect(quantityFor("allocation", PROJECT_IDS.atlas)).toBe(60);
    expect(quantityFor("allocation", PROJECT_IDS.cedar)).toBe(20);
    expect(quantityFor("jira", PROJECT_IDS.atlas)).toBe(1);
    expect(quantityFor("jira", PROJECT_IDS.beacon)).toBe(9);
    expect(quantityFor("calendar", PROJECT_IDS.atlas)).toBe(1);
    expect(quantityFor("calendar", PROJECT_IDS.beacon)).toBe(7);
  });

  it("does not attach any verification status or confidence to a signal", async () => {
    const raw = await new MockAllocationConnector().fetchAllocations(DEMO_WEEK_START);
    const signals = normalizeAllocations(raw, maps);

    for (const signal of signals) {
      expect(Object.keys(signal).sort()).toEqual(
        ["evidence", "personId", "projectId", "quantity", "signalType", "source", "weekStart"].sort(),
      );
      expect(signal).not.toHaveProperty("status");
      expect(signal).not.toHaveProperty("confidence");
    }
  });
});
