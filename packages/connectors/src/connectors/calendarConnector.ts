import { resolve } from "node:path";
import { DEMO_DATA_DIR } from "../paths";
import { readJsonArray } from "../readJsonArray";
import type { RawCalendarActivity } from "../types/rawCalendarActivity";

export interface CalendarConnector {
  fetchActivity(weekStart: string): Promise<RawCalendarActivity[]>;
}

const DEFAULT_CALENDAR_FILE = resolve(DEMO_DATA_DIR, "calendar.json");

export function parseRawCalendarActivity(value: unknown, index: number): RawCalendarActivity {
  if (typeof value !== "object" || value === null) {
    throw new Error(`calendar[${index}] must be an object`);
  }
  const record = value as Record<string, unknown>;

  if (typeof record.attendeeEmail !== "string" || record.attendeeEmail.length === 0) {
    throw new Error(`calendar[${index}].attendeeEmail must be a non-empty string`);
  }
  if (typeof record.projectLabel !== "string" || record.projectLabel.length === 0) {
    throw new Error(`calendar[${index}].projectLabel must be a non-empty string`);
  }
  if (typeof record.meetingHours !== "number" || Number.isNaN(record.meetingHours)) {
    throw new Error(`calendar[${index}].meetingHours must be a number`);
  }
  if (typeof record.week !== "string" || record.week.length === 0) {
    throw new Error(`calendar[${index}].week must be a non-empty string`);
  }

  return record as unknown as RawCalendarActivity;
}

export function parseRawCalendarActivities(items: unknown[]): RawCalendarActivity[] {
  return items.map((item, index) => parseRawCalendarActivity(item, index));
}

/** Reads demo-data/calendar.json. Contains no inference or verification logic. */
export class MockCalendarConnector implements CalendarConnector {
  constructor(private readonly filePath: string = DEFAULT_CALENDAR_FILE) {}

  async fetchActivity(weekStart: string): Promise<RawCalendarActivity[]> {
    const raw = readJsonArray(this.filePath);
    const activity = parseRawCalendarActivities(raw);
    return activity.filter((item) => item.week === weekStart);
  }
}
