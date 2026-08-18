import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, queryClient } from "./client";

async function main() {
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./migrations" });
  console.log("Migrations complete.");
  await queryClient.end();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
