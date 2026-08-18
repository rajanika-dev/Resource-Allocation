import { DEMO_WEEK_START } from "@resource-verification/database";
import { describe, expect, it } from "vitest";
import { MockJiraConnector, parseRawJiraActivities } from "./jiraConnector";

describe("MockJiraConnector", () => {
  it("loads Jira activity data independently for the demo week", async () => {
    const connector = new MockJiraConnector();
    const activity = await connector.fetchActivity(DEMO_WEEK_START);

    expect(activity.length).toBeGreaterThan(0);
    for (const item of activity) {
      expect(typeof item.assigneeEmail).toBe("string");
      expect(typeof item.projectKey).toBe("string");
      expect(typeof item.issuesTouched).toBe("number");
      expect(item.week).toBe(DEMO_WEEK_START);
    }
  });
});

describe("parseRawJiraActivities", () => {
  it("fails clearly when a required field is missing", () => {
    expect(() => parseRawJiraActivities([{ assigneeEmail: "x@example.test" }])).toThrow(/projectKey/);
  });

  it("fails clearly when issuesTouched is not a number", () => {
    expect(() =>
      parseRawJiraActivities([
        { assigneeEmail: "x@example.test", projectKey: "ATLAS", issuesTouched: "nine", week: "2026-08-10" },
      ]),
    ).toThrow(/issuesTouched/);
  });
});
