import {
  activitySignals,
  db,
  people,
  verificationDecisions,
  verificationProjects,
  weeklyVerifications,
} from "@resource-verification/database";
import { and, desc, eq } from "drizzle-orm";
import { NotFoundError } from "../errors";
import { isUuid } from "../uuid";
import { loadProjectNameMap } from "./projectNames";

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

/**
 * UI-friendly shape for the (future) React Employee screen — the frontend
 * should never need to understand raw Drizzle rows (Task 4 section 8).
 */
export interface EmployeeWeekResponse {
  person: {
    id: string;
    name: string;
    role: string | null;
    department: string | null;
  };
  verification: {
    weekStart: string;
    analysisStatus: string;
    confidence: string;
    reviewStatus: string;
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

export async function getPersonOrThrow(personId: string) {
  // A malformed id can never match a real row, and passing a non-UUID string
  // into a uuid-column comparison would make Postgres throw a type error
  // instead of a clean "not found" — so short-circuit before querying.
  if (!isUuid(personId)) {
    throw new NotFoundError(`No employee found with id "${personId}"`);
  }

  const [person] = await db.select().from(people).where(eq(people.id, personId)).limit(1);
  if (!person) {
    throw new NotFoundError(`No employee found with id "${personId}"`);
  }
  return person;
}

export async function getVerificationOrThrow(personId: string, weekStart: string) {
  const [verification] = await db
    .select()
    .from(weeklyVerifications)
    .where(and(eq(weeklyVerifications.personId, personId), eq(weeklyVerifications.weekStart, weekStart)))
    .limit(1);

  if (!verification) {
    throw new NotFoundError(
      `No verification found for employee "${personId}" in week ${weekStart}. Run POST /api/sync first.`,
    );
  }
  return verification;
}

export async function getEmployeeWeek(personId: string, weekStart: string): Promise<EmployeeWeekResponse> {
  const person = await getPersonOrThrow(personId);
  const verification = await getVerificationOrThrow(personId, weekStart);

  const projectNames = await loadProjectNameMap();
  const resolveProjectName = (projectId: string) => projectNames.get(projectId) ?? projectId;

  const projectRows = await db
    .select()
    .from(verificationProjects)
    .where(eq(verificationProjects.verificationId, verification.id));

  const toDistribution = (percentage: string | null): number | null =>
    percentage === null ? null : Number(percentage);

  const plannedDistribution: DistributionEntry[] = projectRows
    .filter((row) => row.plannedPercentage !== null)
    .map((row) => ({
      projectId: row.projectId,
      projectName: resolveProjectName(row.projectId),
      percentage: toDistribution(row.plannedPercentage)!,
    }));

  const observedDistribution: DistributionEntry[] = projectRows
    .filter((row) => row.observedPercentage !== null)
    .map((row) => ({
      projectId: row.projectId,
      projectName: resolveProjectName(row.projectId),
      percentage: toDistribution(row.observedPercentage)!,
    }));

  const signalRows = await db
    .select()
    .from(activitySignals)
    .where(and(eq(activitySignals.personId, personId), eq(activitySignals.weekStart, weekStart)));

  const toEvidenceItem = (row: (typeof signalRows)[number]): EvidenceItem => ({
    projectId: row.projectId,
    projectName: resolveProjectName(row.projectId),
    quantity: Number(row.quantity),
    evidence: (row.evidenceJson as Record<string, unknown> | null) ?? {},
  });

  const evidence = {
    allocation: signalRows.filter((row) => row.source === "allocation").map(toEvidenceItem),
    jira: signalRows.filter((row) => row.source === "jira").map(toEvidenceItem),
    calendar: signalRows.filter((row) => row.source === "calendar").map(toEvidenceItem),
  };

  const [latestDecision] = await db
    .select()
    .from(verificationDecisions)
    .where(eq(verificationDecisions.verificationId, verification.id))
    .orderBy(desc(verificationDecisions.createdAt))
    .limit(1);

  const humanReview: HumanReview | null = latestDecision
    ? {
        decision: latestDecision.decision,
        comment: latestDecision.comment,
        correctedAllocations: latestDecision.correctedAllocationsJson
          ? (latestDecision.correctedAllocationsJson as Array<{ projectId: string; percentage: number }>).map(
              (allocation) => ({
                projectId: allocation.projectId,
                projectName: resolveProjectName(allocation.projectId),
                percentage: allocation.percentage,
              }),
            )
          : null,
        decidedAt: latestDecision.createdAt.toISOString(),
      }
    : null;

  return {
    person: { id: person.id, name: person.name, role: person.role, department: person.department },
    verification: {
      weekStart: verification.weekStart,
      analysisStatus: verification.status,
      confidence: verification.confidence,
      reviewStatus: verification.reviewStatus,
      reason: verification.reason,
      distributionGap: Number(verification.distributionGap),
    },
    plannedDistribution,
    observedDistribution,
    evidence,
    humanReview,
  };
}
