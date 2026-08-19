import { db, projects, verificationDecisions, weeklyVerifications } from "@resource-verification/database";
import { eq } from "drizzle-orm";
import { ValidationError } from "../errors";
import { getEmployeeWeek, getPersonOrThrow, getVerificationOrThrow, type EmployeeWeekResponse } from "./employeeWeekService";

/** No real auth yet — every decision in this MVP is the employee acting on their own week. */
const DECIDED_BY = "employee";

export async function confirmEmployeeWeek(
  personId: string,
  weekStart: string,
  comment: string | undefined,
): Promise<EmployeeWeekResponse> {
  await getPersonOrThrow(personId);
  const verification = await getVerificationOrThrow(personId, weekStart);

  await db.transaction(async (tx) => {
    await tx.insert(verificationDecisions).values({
      verificationId: verification.id,
      decision: "CONFIRM",
      correctedAllocationsJson: null,
      comment: comment ?? null,
      decidedBy: DECIDED_BY,
    });
    await tx
      .update(weeklyVerifications)
      .set({ reviewStatus: "CONFIRMED", updatedAt: new Date() })
      .where(eq(weeklyVerifications.id, verification.id));
  });

  return getEmployeeWeek(personId, weekStart);
}

export interface CorrectedAllocationInput {
  projectId: string;
  percentage: number;
}

async function assertValidCorrection(allocations: CorrectedAllocationInput[]): Promise<void> {
  if (!Array.isArray(allocations) || allocations.length === 0) {
    throw new ValidationError("allocations must be a non-empty array");
  }

  const seenProjectIds = new Set<string>();
  let total = 0;

  for (const allocation of allocations) {
    if (typeof allocation?.projectId !== "string" || allocation.projectId.length === 0) {
      throw new ValidationError("Each allocation must include a non-empty projectId");
    }
    if (seenProjectIds.has(allocation.projectId)) {
      throw new ValidationError(`Duplicate project ID in allocations: ${allocation.projectId}`);
    }
    seenProjectIds.add(allocation.projectId);

    if (typeof allocation.percentage !== "number" || !Number.isFinite(allocation.percentage)) {
      throw new ValidationError(`percentage for project ${allocation.projectId} must be a number`);
    }
    if (allocation.percentage <= 0) {
      throw new ValidationError(`percentage for project ${allocation.projectId} must be greater than 0`);
    }
    if (allocation.percentage > 100) {
      throw new ValidationError(`percentage for project ${allocation.projectId} must be less than or equal to 100`);
    }
    total += allocation.percentage;
  }

  if (total > 100) {
    throw new ValidationError(`Total corrected allocation percentage (${total}) exceeds 100`);
  }

  const knownProjectRows = await db.select({ id: projects.id }).from(projects);
  const knownProjectIds = new Set(knownProjectRows.map((row) => row.id));
  for (const projectId of seenProjectIds) {
    if (!knownProjectIds.has(projectId)) {
      throw new ValidationError(`Unknown project ID: ${projectId}`);
    }
  }
}

/**
 * Persists the human correction WITHOUT touching planned_allocations — that
 * table remains the original planning-source record (Task 4 section 3). The
 * machine analysisStatus/confidence are also left untouched: the engine's
 * MISMATCH finding was correct, the correction is the human's resolution of
 * it, not a retraction of it (Task 4 section 1).
 */
export async function correctEmployeeWeek(
  personId: string,
  weekStart: string,
  allocations: CorrectedAllocationInput[],
  comment: string | undefined,
): Promise<EmployeeWeekResponse> {
  await getPersonOrThrow(personId);
  const verification = await getVerificationOrThrow(personId, weekStart);

  await assertValidCorrection(allocations);

  await db.transaction(async (tx) => {
    await tx.insert(verificationDecisions).values({
      verificationId: verification.id,
      decision: "CORRECT",
      correctedAllocationsJson: allocations,
      comment: comment ?? null,
      decidedBy: DECIDED_BY,
    });
    await tx
      .update(weeklyVerifications)
      .set({ reviewStatus: "CORRECTED", updatedAt: new Date() })
      .where(eq(weeklyVerifications.id, verification.id));
  });

  return getEmployeeWeek(personId, weekStart);
}
