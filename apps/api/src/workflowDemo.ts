import { DEMO_WEEK_START, PEOPLE_IDS, PROJECT_IDS, queryClient, seedDatabase } from "@resource-verification/database";
import { buildServer } from "./server";

const WEEK_START = DEMO_WEEK_START;

function heading(title: string) {
  console.log(`\n${"=".repeat(title.length)}\n${title}\n${"=".repeat(title.length)}`);
}

async function main() {
  const app = buildServer({ logger: false });

  // Step 1 — reset/reseed the demo database so the workflow is repeatable.
  heading("Step 1: Reset demo database");
  await seedDatabase();
  console.log("Database reset to the original fixed demo state.");

  // Step 2 — run sync and show Priya's freshly-computed machine analysis.
  heading("Step 2: POST /api/sync");
  const syncResponse = await app.inject({ method: "POST", url: "/api/sync", payload: { weekStart: WEEK_START } });
  const syncBody = syncResponse.json();
  console.log(`Signals processed: ${syncBody.signalsProcessed}, people analyzed: ${syncBody.peopleAnalyzed}`);

  const priyaSyncResult = syncBody.results.find((result: { personId: string }) => result.personId === PEOPLE_IDS.priyaShah);
  console.log("\nPriya Shah");
  console.log(`Machine analysis: ${priyaSyncResult.analysisStatus}`);
  console.log(`Confidence: ${priyaSyncResult.confidence}`);
  console.log(`Human review: ${priyaSyncResult.reviewStatus}`);

  // Step 2b — executive summary before the correction, for a before/after comparison.
  const executiveBefore = (
    await app.inject({ method: "GET", url: `/api/executive/summary?weekStart=${WEEK_START}` })
  ).json();
  console.log("\nExecutive summary (before correction):");
  console.log(
    `  correctedCount=${executiveBefore.correctedCount} verifiedCount=${executiveBefore.verifiedCount} awaitingConfirmationCount=${executiveBefore.awaitingConfirmationCount}`,
  );

  // Step 3 — submit Priya's correction.
  heading("Step 3: Priya corrects her allocation");
  const correction = {
    weekStart: WEEK_START,
    allocations: [
      { projectId: PROJECT_IDS.atlas, percentage: 30 },
      { projectId: PROJECT_IDS.beacon, percentage: 50 },
      { projectId: PROJECT_IDS.cedar, percentage: 20 },
    ],
    comment: "I spent more time on Project Beacon this week.",
  };
  await app.inject({
    method: "POST",
    url: `/api/employees/${PEOPLE_IDS.priyaShah}/week/correct`,
    payload: correction,
  });
  console.log("Submitted: Atlas 30 / Beacon 50 / Cedar 20");

  // Step 4 — fetch Priya again to prove the correction persisted alongside the unchanged machine analysis.
  heading("Step 4: GET employee week for Priya (after correction)");
  const priyaWeek = (
    await app.inject({ method: "GET", url: `/api/employees/${PEOPLE_IDS.priyaShah}/week?weekStart=${WEEK_START}` })
  ).json();
  console.log(`Machine analysis: ${priyaWeek.verification.analysisStatus}`);
  console.log(`Human review: ${priyaWeek.verification.reviewStatus}`);
  console.log("\nCorrected allocation:");
  for (const allocation of priyaWeek.humanReview.correctedAllocations) {
    console.log(`  ${allocation.projectName.padEnd(16)}${allocation.percentage}`);
  }

  // Step 5 — manager summary.
  heading("Step 5: GET manager exceptions");
  const managerView = (
    await app.inject({ method: "GET", url: `/api/manager/exceptions?weekStart=${WEEK_START}` })
  ).json();
  console.log(
    `${managerView.summary.peopleTracked} people tracked, ${managerView.summary.mismatch} mismatch, ` +
      `${managerView.summary.lowEvidence} low evidence, ${managerView.summary.awaitingConfirmation} awaiting confirmation, ` +
      `${managerView.summary.confirmed} confirmed, ${managerView.summary.corrected} corrected`,
  );
  for (const person of managerView.people) {
    console.log(`  ${person.name.padEnd(14)} ${(person.analysisStatus ?? "—").padEnd(12)} ${person.reviewStatus ?? "—"}`);
  }

  // Step 6 — executive summary after the correction, demonstrating the change.
  heading("Step 6: GET executive summary (after correction)");
  const executiveAfter = (
    await app.inject({ method: "GET", url: `/api/executive/summary?weekStart=${WEEK_START}` })
  ).json();
  console.log(
    `  correctedCount=${executiveAfter.correctedCount} verifiedCount=${executiveAfter.verifiedCount} awaitingConfirmationCount=${executiveAfter.awaitingConfirmationCount}`,
  );
  console.log("\nNeeds attention:");
  for (const item of executiveAfter.needsAttention) {
    console.log(`  - ${item}`);
  }

  console.log("\nBefore -> After");
  console.log(`  correctedCount:            ${executiveBefore.correctedCount} -> ${executiveAfter.correctedCount}`);
  console.log(`  verifiedCount:             ${executiveBefore.verifiedCount} -> ${executiveAfter.verifiedCount}`);
  console.log(
    `  awaitingConfirmationCount: ${executiveBefore.awaitingConfirmationCount} -> ${executiveAfter.awaitingConfirmationCount}`,
  );

  await queryClient.end();
}

main().catch((error) => {
  console.error("workflow:demo failed:", error);
  process.exit(1);
});
