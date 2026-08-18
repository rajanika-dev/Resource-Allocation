import { resolve } from "node:path";
import { DEMO_DATA_DIR } from "../paths";
import { readJsonArray } from "../readJsonArray";
import type { RawJiraActivity } from "../types/rawJiraActivity";

export interface JiraConnector {
  fetchActivity(weekStart: string): Promise<RawJiraActivity[]>;
}

const DEFAULT_JIRA_FILE = resolve(DEMO_DATA_DIR, "jira.json");

export function parseRawJiraActivity(value: unknown, index: number): RawJiraActivity {
  if (typeof value !== "object" || value === null) {
    throw new Error(`jira[${index}] must be an object`);
  }
  const record = value as Record<string, unknown>;

  if (typeof record.assigneeEmail !== "string" || record.assigneeEmail.length === 0) {
    throw new Error(`jira[${index}].assigneeEmail must be a non-empty string`);
  }
  if (typeof record.projectKey !== "string" || record.projectKey.length === 0) {
    throw new Error(`jira[${index}].projectKey must be a non-empty string`);
  }
  if (typeof record.issuesTouched !== "number" || Number.isNaN(record.issuesTouched)) {
    throw new Error(`jira[${index}].issuesTouched must be a number`);
  }
  if (typeof record.week !== "string" || record.week.length === 0) {
    throw new Error(`jira[${index}].week must be a non-empty string`);
  }

  return record as unknown as RawJiraActivity;
}

export function parseRawJiraActivities(items: unknown[]): RawJiraActivity[] {
  return items.map((item, index) => parseRawJiraActivity(item, index));
}

/** Reads demo-data/jira.json. Contains no inference or verification logic. */
export class MockJiraConnector implements JiraConnector {
  constructor(private readonly filePath: string = DEFAULT_JIRA_FILE) {}

  async fetchActivity(weekStart: string): Promise<RawJiraActivity[]> {
    const raw = readJsonArray(this.filePath);
    const activity = parseRawJiraActivities(raw);
    return activity.filter((item) => item.week === weekStart);
  }
}
