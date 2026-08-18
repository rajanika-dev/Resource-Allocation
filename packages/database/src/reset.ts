import { queryClient } from "./client";
import { seedDatabase } from "./seedCore";

async function main() {
  console.log("Resetting demo data to initial seeded state...");
  const counts = await seedDatabase();
  console.log(
    `Reset complete: ${counts.people} people, ${counts.projects} projects, ${counts.plannedAllocations} planned allocations.`,
  );
  await queryClient.end();
}

main().catch((error) => {
  console.error("Reset failed:", error);
  process.exit(1);
});
