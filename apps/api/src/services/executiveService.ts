import { db, people, projects, weeklyVerifications } from "@resource-verification/database";
import { count, eq } from "drizzle-orm";

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

function pluralize(quantity: number, singular: string, plural: string): string {
  return quantity === 1 ? singular : plural;
}

function buildNeedsAttention(counts: {
  mismatchCount: number;
  lowEvidenceCount: number;
  awaitingConfirmationCount: number;
}): string[] {
  const needsAttention: string[] = [];

  if (counts.mismatchCount > 0) {
    needsAttention.push(
      `${counts.mismatchCount} allocation ${pluralize(counts.mismatchCount, "mismatch", "mismatches")} require${
        counts.mismatchCount === 1 ? "s" : ""
      } review`,
    );
  }
  if (counts.lowEvidenceCount > 0) {
    needsAttention.push(
      `${counts.lowEvidenceCount} ${pluralize(counts.lowEvidenceCount, "person has", "people have")} insufficient activity evidence`,
    );
  }
  if (counts.awaitingConfirmationCount > 0) {
    needsAttention.push(
      `${counts.awaitingConfirmationCount} ${pluralize(counts.awaitingConfirmationCount, "person has", "people have")} not confirmed their week`,
    );
  }

  return needsAttention;
}

/** Deliberately low-noise (Task 4 section 13) — verifiedCount = CONFIRMED + CORRECTED, current persisted state only. */
export async function getExecutiveSummary(weekStart: string): Promise<ExecutiveSummary> {
  const [peopleCountRow] = await db.select({ value: count() }).from(people);
  const [projectsCountRow] = await db.select({ value: count() }).from(projects);

  const verificationRows = await db
    .select({ status: weeklyVerifications.status, reviewStatus: weeklyVerifications.reviewStatus })
    .from(weeklyVerifications)
    .where(eq(weeklyVerifications.weekStart, weekStart));

  const confirmedCount = verificationRows.filter((row) => row.reviewStatus === "CONFIRMED").length;
  const correctedCount = verificationRows.filter((row) => row.reviewStatus === "CORRECTED").length;
  const awaitingConfirmationCount = verificationRows.filter(
    (row) => row.reviewStatus === "AWAITING_CONFIRMATION",
  ).length;
  const mismatchCount = verificationRows.filter((row) => row.status === "MISMATCH").length;
  const lowEvidenceCount = verificationRows.filter((row) => row.status === "LOW_EVIDENCE").length;

  return {
    peopleTracked: peopleCountRow.value,
    verifiedCount: confirmedCount + correctedCount,
    awaitingConfirmationCount,
    mismatchCount,
    lowEvidenceCount,
    correctedCount,
    projectsTracked: projectsCountRow.value,
    needsAttention: buildNeedsAttention({ mismatchCount, lowEvidenceCount, awaitingConfirmationCount }),
  };
}
