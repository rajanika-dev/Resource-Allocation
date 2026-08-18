import { sql } from "drizzle-orm";
import { db } from "./client";
import { demoPeople, demoPlannedAllocations, demoProjects } from "./demoData";
import { people, plannedAllocations, projects } from "./schema";

/**
 * Wipes every seeded/derived table and re-inserts the fixed demo dataset.
 * TRUNCATE ... CASCADE on people/projects also clears every table that
 * transitively references them (planned_allocations, activity_signals,
 * weekly_verifications, verification_projects, verification_decisions),
 * so this single function backs both `db:seed` and `demo:reset`.
 */
export async function seedDatabase() {
  await db.execute(sql`TRUNCATE TABLE people, projects RESTART IDENTITY CASCADE`);

  await db.insert(people).values(demoPeople);
  await db.insert(projects).values(demoProjects);
  await db.insert(plannedAllocations).values(demoPlannedAllocations);

  return {
    people: demoPeople.length,
    projects: demoProjects.length,
    plannedAllocations: demoPlannedAllocations.length,
  };
}
