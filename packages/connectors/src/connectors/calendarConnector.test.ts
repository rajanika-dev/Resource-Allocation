import { DEMO_WEEK_START } from "@resource-verification/database";
import { describe, expect, it } from "vitest";
import { MockCalendarConnector, parseRawCalendarActivities } from "./calendarConnector";

describe("MockCalendarConnector", () => {
  it("loads calendar activity data independently for the demo week", async () => {
    const connector = new MockCalendarConnector();
    const activity = await connector.fetchActivity(DEMO_WEEK_START);

    expect(activity.length).toBeGreaterThan(0);
    for (const item of activity) {
      expect(typeof item.attendeeEmail).toBe("string");
      expect(typeof item.projectLabel).toBe("string");
      expect(typeof item.meetingHours).toBe("number");
      expect(item.week).toBe(DEMO_WEEK_START);
    }
  });
});

describe("parseRawCalendarActivities", () => {
  it("fails clearly when a required field is missing", () => {
    expect(() => parseRawCalendarActivities([{ attendeeEmail: "x@example.test" }])).toThrow(/projectLabel/);
  });

  it("fails clearly when meetingHours is not a number", () => {
    expect(() =>
      parseRawCalendarActivities([
        { attendeeEmail: "x@example.test", projectLabel: "Project Atlas", meetingHours: "seven", week: "2026-08-10" },
      ]),
    ).toThrow(/meetingHours/);
  });
});
