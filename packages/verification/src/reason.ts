import { dominantProject } from "./distribution";
import type { AnalysisStatus, ProjectDistribution } from "./types";

const LOW_EVIDENCE_REASON =
  "Not enough Jira or Calendar activity was found to confidently compare observed work with the declared allocation.";
const CONSISTENT_REASON = "Observed activity is concentrated on projects included in the declared allocation.";
const UNSPECIFIED_PROJECT = "an unspecified project";

/**
 * Builds a deterministic, human-readable explanation from the calculated
 * distributions — no LLM involved (SPEC.md section 10). The engine itself
 * only knows project IDs; `resolveProjectName` lets a caller (e.g. the demo
 * runner) supply readable names without the engine depending on any name
 * source.
 */
export function buildReason(
  status: AnalysisStatus,
  plannedDistribution: ProjectDistribution[],
  observedDistribution: ProjectDistribution[],
  resolveProjectName: (projectId: string) => string,
): string {
  if (status === "LOW_EVIDENCE") return LOW_EVIDENCE_REASON;
  if (status === "CONSISTENT") return CONSISTENT_REASON;

  const observedTop = dominantProject(observedDistribution);
  const plannedTop = dominantProject(plannedDistribution);
  const observedName = observedTop ? resolveProjectName(observedTop.projectId) : UNSPECIFIED_PROJECT;
  const plannedName = plannedTop ? resolveProjectName(plannedTop.projectId) : UNSPECIFIED_PROJECT;

  return `Observed activity is concentrated on ${observedName} while the declared allocation is concentrated on ${plannedName}.`;
}
