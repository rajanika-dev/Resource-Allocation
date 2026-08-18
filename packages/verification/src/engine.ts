import type { ResourceSignal } from "@resource-verification/shared";
import { combineObservedDistribution } from "./combineObservedDistribution";
import { MIN_CALENDAR_HOURS, MIN_JIRA_ACTIVITY, MISMATCH_GAP_THRESHOLD, SOURCE_AGREEMENT_MAX_GAP } from "./constants";
import { buildDistribution, totalQuantity, totalVariationGap } from "./distribution";
import { buildReason } from "./reason";
import type { AnalysisStatus, Confidence, EvaluateOptions, VerificationResult } from "./types";

function groupByPersonWeek(signals: ResourceSignal[]): Map<string, ResourceSignal[]> {
  const groups = new Map<string, ResourceSignal[]>();
  for (const signal of signals) {
    const key = `${signal.personId}::${signal.weekStart}`;
    const group = groups.get(key);
    if (group) group.push(signal);
    else groups.set(key, [signal]);
  }
  return groups;
}

function evaluatePersonWeek(
  personId: string,
  weekStart: string,
  signals: ResourceSignal[],
  options: EvaluateOptions,
): VerificationResult {
  const allocationSignals = signals.filter(
    (signal) => signal.source === "allocation" && signal.signalType === "declared_allocation",
  );
  const jiraSignals = signals.filter((signal) => signal.source === "jira" && signal.signalType === "work_activity");
  const calendarSignals = signals.filter(
    (signal) => signal.source === "calendar" && signal.signalType === "meeting_activity",
  );

  const plannedDistribution = buildDistribution(allocationSignals);
  const jiraDistribution = buildDistribution(jiraSignals);
  const calendarDistribution = buildDistribution(calendarSignals);

  const jiraTotal = totalQuantity(jiraSignals);
  const calendarTotal = totalQuantity(calendarSignals);

  const jiraMeaningful = jiraTotal >= MIN_JIRA_ACTIVITY;
  const calendarMeaningful = calendarTotal >= MIN_CALENDAR_HOURS;
  const isLowEvidence = !jiraMeaningful && !calendarMeaningful;

  const observedDistribution = combineObservedDistribution(
    jiraDistribution,
    jiraMeaningful,
    calendarDistribution,
    calendarMeaningful,
  );

  const distributionGap = totalVariationGap(plannedDistribution, observedDistribution);

  const status: AnalysisStatus = isLowEvidence
    ? "LOW_EVIDENCE"
    : distributionGap >= MISMATCH_GAP_THRESHOLD
      ? "MISMATCH"
      : "CONSISTENT";

  let confidence: Confidence;
  if (isLowEvidence) {
    confidence = "LOW";
  } else if (jiraMeaningful && calendarMeaningful) {
    const sourceGap = totalVariationGap(jiraDistribution, calendarDistribution);
    confidence = sourceGap <= SOURCE_AGREEMENT_MAX_GAP ? "HIGH" : "MEDIUM";
  } else {
    // Exactly one of Jira/Calendar is meaningful.
    confidence = "MEDIUM";
  }

  const resolveProjectName = options.resolveProjectName ?? ((projectId: string) => projectId);
  const reason = buildReason(status, plannedDistribution, observedDistribution, resolveProjectName);

  return {
    personId,
    weekStart,
    status,
    confidence,
    plannedDistribution,
    jiraDistribution,
    calendarDistribution,
    observedDistribution,
    distributionGap,
    reason,
  };
}

/**
 * Consumes only ResourceSignal[] — never raw Jira/Calendar/allocation
 * payloads — and returns one deterministic VerificationResult per
 * (personId, weekStart) pair present in the data.
 */
export function runVerificationEngine(
  signals: ResourceSignal[],
  options: EvaluateOptions = {},
): VerificationResult[] {
  const groups = groupByPersonWeek(signals);

  return [...groups.entries()]
    .map(([key, group]) => {
      const separatorIndex = key.lastIndexOf("::");
      const personId = key.slice(0, separatorIndex);
      const weekStart = key.slice(separatorIndex + 2);
      return evaluatePersonWeek(personId, weekStart, group, options);
    })
    .sort((a, b) => a.personId.localeCompare(b.personId));
}
