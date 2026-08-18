/**
 * Machine analysis result of the verification engine. Deliberately excludes
 * human workflow states (CONFIRMED / CORRECTED) — those belong to a later
 * increment once a person has reviewed this result.
 */
export type AnalysisStatus = "CONSISTENT" | "MISMATCH" | "LOW_EVIDENCE";

/**
 * Describes evidence quality/agreement between sources — NOT a statistical
 * probability and NOT an AI confidence score.
 */
export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export interface ProjectDistribution {
  projectId: string;
  /** Percentage of the underlying total, 0-100. */
  percentage: number;
}

export interface VerificationResult {
  personId: string;
  weekStart: string;

  status: AnalysisStatus;
  confidence: Confidence;

  plannedDistribution: ProjectDistribution[];
  jiraDistribution: ProjectDistribution[];
  calendarDistribution: ProjectDistribution[];
  observedDistribution: ProjectDistribution[];

  /** Total variation distance between planned and observed, 0-100 scale. */
  distributionGap: number;
  reason: string;
}

export interface EvaluateOptions {
  /**
   * The core engine only knows project IDs. A caller (e.g. the demo runner)
   * may supply this to produce human-readable reason text; it has no effect
   * on classification.
   */
  resolveProjectName?: (projectId: string) => string;
}
