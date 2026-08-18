import type { ResourceSignal } from "@resource-verification/shared";
import { type IdentityMaps, resolvePersonIdByEmail, resolveProjectIdByName } from "../identity";
import { resolveProjectNameFromCode } from "../projectCodes";
import type { RawJiraActivity } from "../types/rawJiraActivity";

/** RawJiraActivity[] -> ResourceSignal[]. Translation only, no inference. */
export function normalizeJiraActivity(raw: RawJiraActivity[], maps: IdentityMaps): ResourceSignal[] {
  return raw.map((activity) => {
    const personId = resolvePersonIdByEmail(activity.assigneeEmail, maps);
    const projectName = resolveProjectNameFromCode(activity.projectKey);
    const projectId = resolveProjectIdByName(projectName, maps);

    return {
      personId,
      projectId,
      source: "jira",
      signalType: "work_activity",
      quantity: activity.issuesTouched,
      weekStart: activity.week,
      evidence: {
        assigneeEmail: activity.assigneeEmail,
        projectKey: activity.projectKey,
        issuesTouched: activity.issuesTouched,
      },
    };
  });
}
