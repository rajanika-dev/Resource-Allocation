import type { ResourceSignal } from "@resource-verification/shared";
import { type IdentityMaps, resolvePersonIdByEmail, resolveProjectIdByName } from "../identity";
import type { RawCalendarActivity } from "../types/rawCalendarActivity";

/** RawCalendarActivity[] -> ResourceSignal[]. Translation only, no inference. */
export function normalizeCalendarActivity(raw: RawCalendarActivity[], maps: IdentityMaps): ResourceSignal[] {
  return raw.map((activity) => {
    const personId = resolvePersonIdByEmail(activity.attendeeEmail, maps);
    const projectId = resolveProjectIdByName(activity.projectLabel, maps);

    return {
      personId,
      projectId,
      source: "calendar",
      signalType: "meeting_activity",
      quantity: activity.meetingHours,
      weekStart: activity.week,
      evidence: {
        attendeeEmail: activity.attendeeEmail,
        projectLabel: activity.projectLabel,
        meetingHours: activity.meetingHours,
      },
    };
  });
}
