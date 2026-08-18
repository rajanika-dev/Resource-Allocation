import { queryClient } from "./client";
import { seedDatabase } from "./seedCore";

async function main() {
  console.log("Seeding demo data...");
  const counts = await seedDatabase();
  console.log(
    `Seeded ${counts.people} people, ${counts.projects} projects, ${counts.plannedAllocations} planned allocations.`,
  );
  await queryClient.end();
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
