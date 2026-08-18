import { DEMO_WEEK_START, queryClient } from "@resource-verification/database";
import type { ResourceSignal, SignalSource } from "@resource-verification/shared";
import { MockAllocationConnector, MockCalendarConnector, MockJiraConnector } from "./connectors";
import { type IdentityMaps, loadIdentityMaps } from "./identity";
import { normalizeAllocations, normalizeCalendarActivity, normalizeJiraActivity } from "./normalize";

const SOURCE_LABELS: Record<SignalSource, string> = {
  allocation: "ALLOCATION",
  jira: "JIRA",
  calendar: "CALENDAR",
};
const SOURCE_ORDER: SignalSource[] = ["allocation", "jira", "calendar"];

function printSummary(signals: ResourceSignal[], maps: IdentityMaps, weekStart: string) {
  console.log(`ResourceSignal[] summary — week ${weekStart}`);
  console.log(`Total signals: ${signals.length}`);

  const personIds = [...new Set(signals.map((signal) => signal.personId))].sort((a, b) =>
    (maps.personNameById.get(a) ?? "").localeCompare(maps.personNameById.get(b) ?? ""),
  );

  for (const personId of personIds) {
    const name = maps.personNameById.get(personId) ?? personId;
    const email = maps.personEmailById.get(personId) ?? "";
    console.log(`\n=== ${name} (${email}) ===`);

    for (const source of SOURCE_ORDER) {
      const rows = signals.filter((signal) => signal.personId === personId && signal.source === source);
      if (rows.length === 0) continue;

      console.log(`\n${SOURCE_LABELS[source]}`);
      for (const row of rows) {
        const projectName = maps.projectNameById.get(row.projectId) ?? row.projectId;
        console.log(`  ${projectName.padEnd(16)}${row.quantity}`);
      }
    }
  }
  console.log("");
}

async function main() {
  const weekStart = DEMO_WEEK_START;

  const allocationConnector = new MockAllocationConnector();
  const jiraConnector = new MockJiraConnector();
  const calendarConnector = new MockCalendarConnector();

  const [rawAllocations, rawJira, rawCalendar, maps] = await Promise.all([
    allocationConnector.fetchAllocations(weekStart),
    jiraConnector.fetchActivity(weekStart),
    calendarConnector.fetchActivity(weekStart),
    loadIdentityMaps(),
  ]);

  const signals: ResourceSignal[] = [
    ...normalizeAllocations(rawAllocations, maps),
    ...normalizeJiraActivity(rawJira, maps),
    ...normalizeCalendarActivity(rawCalendar, maps),
  ];

  printSummary(signals, maps, weekStart);

  await queryClient.end();
}

main().catch((error) => {
  console.error("connectors:demo failed:", error);
  process.exit(1);
});
