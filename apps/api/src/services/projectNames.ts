import { db, projects } from "@resource-verification/database";

/** Small, request-scoped id -> name lookup for API responses. Not a general identity platform. */
export async function loadProjectNameMap(): Promise<Map<string, string>> {
  const rows = await db.select({ id: projects.id, name: projects.name }).from(projects);
  return new Map(rows.map((row) => [row.id, row.name]));
}
