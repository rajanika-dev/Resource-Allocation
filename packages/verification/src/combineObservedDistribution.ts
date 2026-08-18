import { CALENDAR_WEIGHT, JIRA_WEIGHT } from "./constants";
import { weightedCombine } from "./distribution";
import type { ProjectDistribution } from "./types";

/**
 * Combines Jira and Calendar distributions into one observed distribution.
 *
 * If only one source has meaningful evidence, that source is used directly
 * (already 100%-normalized) rather than treating the missing source as zero
 * activity, which would otherwise understate the observed signal
 * (SPEC.md section 6).
 */
export function combineObservedDistribution(
  jiraDistribution: ProjectDistribution[],
  jiraMeaningful: boolean,
  calendarDistribution: ProjectDistribution[],
  calendarMeaningful: boolean,
): ProjectDistribution[] {
  if (jiraMeaningful && !calendarMeaningful) return jiraDistribution;
  if (!jiraMeaningful && calendarMeaningful) return calendarDistribution;

  return weightedCombine(jiraDistribution, JIRA_WEIGHT, calendarDistribution, CALENDAR_WEIGHT);
}
