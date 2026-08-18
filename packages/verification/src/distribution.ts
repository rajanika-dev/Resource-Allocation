import type { ResourceSignal } from "@resource-verification/shared";
import type { ProjectDistribution } from "./types";

function sumQuantityByProject(signals: ResourceSignal[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const signal of signals) {
    totals.set(signal.projectId, (totals.get(signal.projectId) ?? 0) + signal.quantity);
  }
  return totals;
}

/** Sum of quantity across all given signals (e.g. total Jira activity count). */
export function totalQuantity(signals: ResourceSignal[]): number {
  return signals.reduce((sum, signal) => sum + signal.quantity, 0);
}

/**
 * Normalizes a set of signals into a percentage-of-total distribution
 * across only the projects that appear in `signals` — unassigned/remaining
 * capacity is never represented as a project (SPEC.md section 3).
 */
export function buildDistribution(signals: ResourceSignal[]): ProjectDistribution[] {
  const totals = sumQuantityByProject(signals);
  const total = [...totals.values()].reduce((sum, value) => sum + value, 0);
  if (total <= 0) return [];

  return [...totals.entries()]
    .map(([projectId, quantity]) => ({ projectId, percentage: (quantity / total) * 100 }))
    .sort((a, b) => a.projectId.localeCompare(b.projectId));
}

function percentageFor(distribution: ProjectDistribution[], projectId: string): number {
  return distribution.find((entry) => entry.projectId === projectId)?.percentage ?? 0;
}

/**
 * Total variation distance between two distributions, on a 0-100 scale,
 * over the union of every project appearing in either one (SPEC.md
 * section 8).
 */
export function totalVariationGap(a: ProjectDistribution[], b: ProjectDistribution[]): number {
  const projectIds = new Set([...a.map((entry) => entry.projectId), ...b.map((entry) => entry.projectId)]);

  let sum = 0;
  for (const projectId of projectIds) {
    sum += Math.abs(percentageFor(a, projectId) - percentageFor(b, projectId));
  }
  return 0.5 * sum;
}

/** Combines two distributions with the given weights over the union of their projects. */
export function weightedCombine(
  a: ProjectDistribution[],
  weightA: number,
  b: ProjectDistribution[],
  weightB: number,
): ProjectDistribution[] {
  const projectIds = new Set([...a.map((entry) => entry.projectId), ...b.map((entry) => entry.projectId)]);

  return [...projectIds]
    .map((projectId) => ({
      projectId,
      percentage: percentageFor(a, projectId) * weightA + percentageFor(b, projectId) * weightB,
    }))
    .sort((x, y) => x.projectId.localeCompare(y.projectId));
}

/** The project with the highest percentage in a distribution (lowest projectId wins ties). */
export function dominantProject(distribution: ProjectDistribution[]): ProjectDistribution | undefined {
  return distribution.reduce<ProjectDistribution | undefined>((max, entry) => {
    if (!max || entry.percentage > max.percentage) return entry;
    return max;
  }, undefined);
}
