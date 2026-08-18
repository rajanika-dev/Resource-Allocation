import type { ResourceSignal } from "@resource-verification/shared";
import { describe, expect, it } from "vitest";
import { runVerificationEngine } from "./engine";

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

describe("runVerificationEngine", () => {
  it("returns LOW_EVIDENCE with LOW confidence when both Jira and Calendar are below the minimum", () => {
    const signals: ResourceSignal[] = [
      signal({ projectId: "atlas", quantity: 100 }),
      signal({ source: "jira", signalType: "work_activity", projectId: "atlas", quantity: 1 }),
      signal({ source: "calendar", signalType: "meeting_activity", projectId: "atlas", quantity: 1 }),
    ];

    const [result] = runVerificationEngine(signals);

    expect(result.status).toBe("LOW_EVIDENCE");
    expect(result.confidence).toBe("LOW");
    expect(result.reason).toMatch(/not enough jira or calendar activity/i);
  });

  it("returns CONSISTENT with HIGH confidence when Jira and Calendar agree with the plan", () => {
    const signals: ResourceSignal[] = [
      signal({ projectId: "atlas", quantity: 70 }),
      signal({ projectId: "beacon", quantity: 30 }),
      signal({ source: "jira", signalType: "work_activity", projectId: "atlas", quantity: 7 }),
      signal({ source: "jira", signalType: "work_activity", projectId: "beacon", quantity: 3 }),
      signal({ source: "calendar", signalType: "meeting_activity", projectId: "atlas", quantity: 7 }),
      signal({ source: "calendar", signalType: "meeting_activity", projectId: "beacon", quantity: 3 }),
    ];

    const [result] = runVerificationEngine(signals);

    expect(result.status).toBe("CONSISTENT");
    expect(result.confidence).toBe("HIGH");
    expect(result.distributionGap).toBeCloseTo(0, 5);
  });

  it("returns MISMATCH when observed activity strongly favors a different project than planned", () => {
    const signals: ResourceSignal[] = [
      signal({ projectId: "atlas", quantity: 80 }),
      signal({ projectId: "beacon", quantity: 20 }),
      signal({ source: "jira", signalType: "work_activity", projectId: "atlas", quantity: 1 }),
      signal({ source: "jira", signalType: "work_activity", projectId: "beacon", quantity: 9 }),
      signal({ source: "calendar", signalType: "meeting_activity", projectId: "atlas", quantity: 1 }),
      signal({ source: "calendar", signalType: "meeting_activity", projectId: "beacon", quantity: 9 }),
    ];

    const [result] = runVerificationEngine(signals);

    expect(result.status).toBe("MISMATCH");
    expect(result.distributionGap).toBeGreaterThanOrEqual(50);
    expect(result.reason).toMatch(/concentrated on/i);
  });

  it("returns MEDIUM confidence when only one observed source has meaningful evidence", () => {
    const signals: ResourceSignal[] = [
      signal({ projectId: "atlas", quantity: 70 }),
      signal({ projectId: "beacon", quantity: 30 }),
      signal({ source: "jira", signalType: "work_activity", projectId: "atlas", quantity: 7 }),
      signal({ source: "jira", signalType: "work_activity", projectId: "beacon", quantity: 3 }),
      // Calendar total = 1, below MIN_CALENDAR_HOURS — not meaningful.
      signal({ source: "calendar", signalType: "meeting_activity", projectId: "atlas", quantity: 1 }),
    ];

    const [result] = runVerificationEngine(signals);

    expect(result.confidence).toBe("MEDIUM");
    expect(result.status).toBe("CONSISTENT");
    expect(result.observedDistribution).toEqual(result.jiraDistribution);
  });

  it("returns MEDIUM confidence when Jira and Calendar materially disagree", () => {
    const signals: ResourceSignal[] = [
      signal({ projectId: "atlas", quantity: 50 }),
      signal({ projectId: "beacon", quantity: 50 }),
      signal({ source: "jira", signalType: "work_activity", projectId: "atlas", quantity: 9 }),
      signal({ source: "jira", signalType: "work_activity", projectId: "beacon", quantity: 1 }),
      signal({ source: "calendar", signalType: "meeting_activity", projectId: "atlas", quantity: 1 }),
      signal({ source: "calendar", signalType: "meeting_activity", projectId: "beacon", quantity: 9 }),
    ];

    const [result] = runVerificationEngine(signals);

    expect(result.confidence).toBe("MEDIUM");
  });

  it("groups results independently per person and week", () => {
    const signals: ResourceSignal[] = [
      signal({ personId: "person-a", projectId: "atlas", quantity: 100 }),
      signal({ personId: "person-a", source: "jira", signalType: "work_activity", projectId: "atlas", quantity: 5 }),
      signal({
        personId: "person-a",
        source: "calendar",
        signalType: "meeting_activity",
        projectId: "atlas",
        quantity: 5,
      }),
      signal({ personId: "person-b", projectId: "beacon", quantity: 100 }),
      signal({ personId: "person-b", source: "jira", signalType: "work_activity", projectId: "beacon", quantity: 5 }),
      signal({
        personId: "person-b",
        source: "calendar",
        signalType: "meeting_activity",
        projectId: "beacon",
        quantity: 5,
      }),
    ];

    const results = runVerificationEngine(signals);

    expect(results).toHaveLength(2);
    expect(results.map((result) => result.personId).sort()).toEqual(["person-a", "person-b"]);
  });

  it("produces MISMATCH/HIGH for an arbitrary person ID given Priya-shaped numbers, proving no name-specific rules", () => {
    const signals: ResourceSignal[] = [
      signal({ personId: "anon-1", projectId: "atlas", quantity: 60 }),
      signal({ personId: "anon-1", projectId: "cedar", quantity: 20 }),
      signal({ personId: "anon-1", source: "jira", signalType: "work_activity", projectId: "atlas", quantity: 1 }),
      signal({ personId: "anon-1", source: "jira", signalType: "work_activity", projectId: "beacon", quantity: 9 }),
      signal({
        personId: "anon-1",
        source: "calendar",
        signalType: "meeting_activity",
        projectId: "atlas",
        quantity: 1,
      }),
      signal({
        personId: "anon-1",
        source: "calendar",
        signalType: "meeting_activity",
        projectId: "beacon",
        quantity: 7,
      }),
    ];

    const [result] = runVerificationEngine(signals);

    expect(result.status).toBe("MISMATCH");
    expect(result.confidence).toBe("HIGH");
  });
});
