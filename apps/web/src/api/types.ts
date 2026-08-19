/**
 * Mirrors the response shapes served by apps/api (Task 4). Kept as a small
 * hand-written contract rather than importing server types, so the frontend
 * stays decoupled from backend internals.
 */

export type AnalysisStatus = "CONSISTENT" | "MISMATCH" | "LOW_EVIDENCE";
export type Confidence = "HIGH" | "MEDIUM" | "LOW";
export type ReviewStatus = "AWAITING_CONFIRMATION" | "CONFIRMED" | "CORRECTED";

export interface DistributionEntry {
  projectId: string;
  projectName: string;
  percentage: number;
}

export interface EvidenceItem {
  projectId: string;
  projectName: string;
  quantity: number;
  evidence: Record<string, unknown>;
}

export interface HumanReview {
  decision: string;
  comment: string | null;
  correctedAllocations: DistributionEntry[] | null;
  decidedAt: string;
}

export interface EmployeeWeek {
  person: {
    id: string;
    name: string;
    role: string | null;
    department: string | null;
  };
  verification: {
    weekStart: string;
    analysisStatus: AnalysisStatus;
    confidence: Confidence;
    reviewStatus: ReviewStatus;
    reason: string;
    distributionGap: number;
  };
  plannedDistribution: DistributionEntry[];
  observedDistribution: DistributionEntry[];
  evidence: {
    allocation: EvidenceItem[];
    jira: EvidenceItem[];
    calendar: EvidenceItem[];
  };
  humanReview: HumanReview | null;
}

export interface ManagerPerson {
  personId: string;
  name: string;
  role: string | null;
  department: string | null;
  analysisStatus: AnalysisStatus | null;
  confidence: Confidence | null;
  reviewStatus: ReviewStatus | null;
  reason: string | null;
}

export interface ManagerExceptions {
  weekStart: string;
  summary: {
    peopleTracked: number;
    awaitingConfirmation: number;
    confirmed: number;
    corrected: number;
    mismatch: number;
    lowEvidence: number;
  };
  people: ManagerPerson[];
}

export interface ExecutiveSummary {
  peopleTracked: number;
  verifiedCount: number;
  awaitingConfirmationCount: number;
  mismatchCount: number;
  lowEvidenceCount: number;
  correctedCount: number;
  projectsTracked: number;
  needsAttention: string[];
}

export interface SyncSummary {
  weekStart: string;
  signalsProcessed: number;
  peopleAnalyzed: number;
  results: Array<{
    personId: string;
    name: string;
    analysisStatus: AnalysisStatus;
    confidence: Confidence;
    reviewStatus: ReviewStatus;
  }>;
}

export interface CorrectedAllocationInput {
  projectId: string;
  percentage: number;
}
