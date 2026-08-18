import {
  loadIdentityMaps,
  MockAllocationConnector,
  MockCalendarConnector,
  MockJiraConnector,
  normalizeAllocations,
  normalizeCalendarActivity,
  normalizeJiraActivity,
} from "@resource-verification/connectors";
import { DEMO_WEEK_START, queryClient } from "@resource-verification/database";
import type { ResourceSignal } from "@resource-verification/shared";
import { runVerificationEngine } from "./engine";
import type { ProjectDistribution, VerificationResult } from "./types";

function printDistribution(label: string, distribution: ProjectDistribution[], resolveProjectName: (id: string) => string) {
  if (distribution.length === 0) {
    console.log(`  ${label}: (none)`);
    return;
  }
  console.log(`  ${label}:`);
  for (const entry of distribution) {
    console.log(`    ${resolveProjectName(entry.projectId).padEnd(16)}${entry.percentage.toFixed(1)}%`);
  }
}

function printResult(name: string, result: VerificationResult, resolveProjectName: (id: string) => string) {
  console.log(`\n${name}`);
  console.log(`  Status:     ${result.status}`);
  console.log(`  Confidence: ${result.confidence}`);
  console.log(`  Reason:     ${result.reason}`);
  console.log(`  Distribution gap: ${result.distributionGap.toFixed(1)}`);
  printDistribution("Planned", result.plannedDistribution, resolveProjectName);
  printDistribution("Observed", result.observedDistribution, resolveProjectName);
}

async function main() {
  const weekStart = DEMO_WEEK_START;

  const [rawAllocations, rawJira, rawCalendar, maps] = await Promise.all([
    new MockAllocationConnector().fetchAllocations(weekStart),
    new MockJiraConnector().fetchActivity(weekStart),
    new MockCalendarConnector().fetchActivity(weekStart),
    loadIdentityMaps(),
  ]);

  const signals: ResourceSignal[] = [
    ...normalizeAllocations(rawAllocations, maps),
    ...normalizeJiraActivity(rawJira, maps),
    ...normalizeCalendarActivity(rawCalendar, maps),
  ];

  const resolveProjectName = (projectId: string) => maps.projectNameById.get(projectId) ?? projectId;
  const results = runVerificationEngine(signals, { resolveProjectName });

  const sortedByName = [...results].sort((a, b) =>
    (maps.personNameById.get(a.personId) ?? "").localeCompare(maps.personNameById.get(b.personId) ?? ""),
  );

  console.log(`Verification results — week ${weekStart}`);
  console.log(`People evaluated: ${sortedByName.length}`);

  for (const result of sortedByName) {
    const name = maps.personNameById.get(result.personId) ?? result.personId;
    printResult(name, result, resolveProjectName);
  }
  console.log("");

  await queryClient.end();
}

main().catch((error) => {
  console.error("verification:demo failed:", error);
  process.exit(1);
});
