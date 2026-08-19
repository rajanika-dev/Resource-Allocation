import { db, people, weeklyVerifications } from "@resource-verification/database";
import { and, eq } from "drizzle-orm";

export interface ManagerPersonSummary {
  personId: string;
  name: string;
  role: string | null;
  department: string | null;
  analysisStatus: string | null;
  confidence: string | null;
  reviewStatus: string | null;
  reason: string | null;
}

export interface ManagerExceptionsSummary {
  peopleTracked: number;
  awaitingConfirmation: number;
  confirmed: number;
  corrected: number;
  mismatch: number;
  lowEvidence: number;
}

export interface ManagerExceptionsResponse {
  weekStart: string;
  summary: ManagerExceptionsSummary;
  people: ManagerPersonSummary[];
}

export interface ManagerExceptionsFilters {
  analysisStatus?: string;
  reviewStatus?: string;
}

/**
 * There is no real login/org chart in this MVP — every seeded person is
 * treated as the demo manager's team (Task 4 section 11). `summary` always
 * reflects the full team; `filters` only narrow the returned `people` list,
 * so the dashboard totals stay stable while the list can be scoped down.
 */
export async function getManagerExceptions(
  weekStart: string,
  filters: ManagerExceptionsFilters = {},
): Promise<ManagerExceptionsResponse> {
  const rows = await db
    .select({
      personId: people.id,
      name: people.name,
      role: people.role,
      department: people.department,
      analysisStatus: weeklyVerifications.status,
      confidence: weeklyVerifications.confidence,
      reviewStatus: weeklyVerifications.reviewStatus,
      reason: weeklyVerifications.reason,
    })
    .from(people)
    .leftJoin(
      weeklyVerifications,
      and(eq(weeklyVerifications.personId, people.id), eq(weeklyVerifications.weekStart, weekStart)),
    );

  const allPeople: ManagerPersonSummary[] = rows.map((row) => ({ ...row }));

  const summary: ManagerExceptionsSummary = {
    peopleTracked: allPeople.length,
    awaitingConfirmation: allPeople.filter((person) => person.reviewStatus === "AWAITING_CONFIRMATION").length,
    confirmed: allPeople.filter((person) => person.reviewStatus === "CONFIRMED").length,
    corrected: allPeople.filter((person) => person.reviewStatus === "CORRECTED").length,
    mismatch: allPeople.filter((person) => person.analysisStatus === "MISMATCH").length,
    lowEvidence: allPeople.filter((person) => person.analysisStatus === "LOW_EVIDENCE").length,
  };

  const filteredPeople = allPeople
    .filter((person) => !filters.analysisStatus || person.analysisStatus === filters.analysisStatus)
    .filter((person) => !filters.reviewStatus || person.reviewStatus === filters.reviewStatus)
    .sort((a, b) => a.name.localeCompare(b.name));

  return { weekStart, summary, people: filteredPeople };
}
