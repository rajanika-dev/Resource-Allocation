import {
  loadIdentityMaps,
  MockAllocationConnector,
  MockCalendarConnector,
  MockJiraConnector,
  normalizeAllocations,
  normalizeCalendarActivity,
  normalizeJiraActivity,
  type IdentityMaps,
} from "@resource-verification/connectors";
import { activitySignals, db, verificationProjects, weeklyVerifications } from "@resource-verification/database";
import type { ResourceSignal } from "@resource-verification/shared";
import {
  runVerificationEngine,
  type AnalysisStatus,
  type Confidence,
  type ProjectDistribution,
  type VerificationResult,
} from "@resource-verification/verification";
import { eq } from "drizzle-orm";
import { SyncFailedError } from "../errors";

export interface SyncResultItem {
  personId: string;
  name: string;
  analysisStatus: AnalysisStatus;
  confidence: Confidence;
  reviewStatus: string;
}

export interface SyncSummary {
  weekStart: string;
  signalsProcessed: number;
  peopleAnalyzed: number;
  results: SyncResultItem[];
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function fetchSyncInputs(weekStart: string): Promise<{
  signals: ResourceSignal[];
  maps: IdentityMaps;
}> {
  try {
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

    return { signals, maps };
  } catch (error) {
    throw new SyncFailedError(error instanceof Error ? error.message : String(error));
  }
}

/** Replace-then-insert scoped to this week — the simplest idempotent strategy that avoids duplicate activity rows on repeated sync. */
async function persistActivitySignals(tx: Tx, weekStart: string, signals: ResourceSignal[]): Promise<void> {
  await tx.delete(activitySignals).where(eq(activitySignals.weekStart, weekStart));
  if (signals.length === 0) return;

  await tx.insert(activitySignals).values(
    signals.map((signal) => ({
      personId: signal.personId,
      projectId: signal.projectId,
      source: signal.source,
      activityType: signal.signalType,
      quantity: signal.quantity.toString(),
      weekStart: signal.weekStart,
      evidenceJson: signal.evidence,
    })),
  );
}

/**
 * Upserts the machine analysis for one person/week. `reviewStatus` is set
 * only in the insert `values()`, never in the conflict `set`, so an existing
 * human review decision survives a re-sync untouched (Task 4 section 6).
 */
async function upsertWeeklyVerification(tx: Tx, weekStart: string, result: VerificationResult) {
  const [verification] = await tx
    .insert(weeklyVerifications)
    .values({
      personId: result.personId,
      weekStart,
      status: result.status,
      confidence: result.confidence,
      reason: result.reason,
      distributionGap: result.distributionGap.toString(),
      reviewStatus: "AWAITING_CONFIRMATION",
    })
    .onConflictDoUpdate({
      target: [weeklyVerifications.personId, weeklyVerifications.weekStart],
      set: {
        status: result.status,
        confidence: result.confidence,
        reason: result.reason,
        distributionGap: result.distributionGap.toString(),
        updatedAt: new Date(),
      },
    })
    .returning();

  return verification;
}

function percentageLookup(distribution: ProjectDistribution[]): Map<string, number> {
  return new Map(distribution.map((entry) => [entry.projectId, entry.percentage]));
}

/** Replace-then-insert per verification — simplest way to keep this in sync with whatever project set the current signals produced. */
async function replaceVerificationProjects(tx: Tx, verificationId: string, result: VerificationResult): Promise<void> {
  await tx.delete(verificationProjects).where(eq(verificationProjects.verificationId, verificationId));

  const planned = percentageLookup(result.plannedDistribution);
  const jira = percentageLookup(result.jiraDistribution);
  const calendar = percentageLookup(result.calendarDistribution);
  const observed = percentageLookup(result.observedDistribution);
  const projectIds = new Set([...planned.keys(), ...jira.keys(), ...calendar.keys(), ...observed.keys()]);

  if (projectIds.size === 0) return;

  await tx.insert(verificationProjects).values(
    [...projectIds].map((projectId) => ({
      verificationId,
      projectId,
      plannedPercentage: planned.get(projectId)?.toString() ?? null,
      jiraPercentage: jira.get(projectId)?.toString() ?? null,
      calendarPercentage: calendar.get(projectId)?.toString() ?? null,
      observedPercentage: observed.get(projectId)?.toString() ?? null,
    })),
  );
}

/**
 * Loads the three mock sources, normalizes them, persists the signals and
 * machine analysis for `weekStart`, and returns a compact summary
 * (SPEC.md section 13 / Task 4 section 5).
 */
export async function runSync(weekStart: string): Promise<SyncSummary> {
  const { signals, maps } = await fetchSyncInputs(weekStart);

  const resolveProjectName = (projectId: string) => maps.projectNameById.get(projectId) ?? projectId;
  const results = runVerificationEngine(signals, { resolveProjectName });

  const resultItems = await db.transaction(async (tx) => {
    await persistActivitySignals(tx, weekStart, signals);

    const items: SyncResultItem[] = [];
    for (const result of results) {
      const verification = await upsertWeeklyVerification(tx, weekStart, result);
      await replaceVerificationProjects(tx, verification.id, result);

      items.push({
        personId: result.personId,
        name: maps.personNameById.get(result.personId) ?? result.personId,
        analysisStatus: result.status,
        confidence: result.confidence,
        reviewStatus: verification.reviewStatus,
      });
    }
    return items;
  });

  resultItems.sort((a, b) => a.name.localeCompare(b.name));

  return {
    weekStart,
    signalsProcessed: signals.length,
    peopleAnalyzed: results.length,
    results: resultItems,
  };
}
