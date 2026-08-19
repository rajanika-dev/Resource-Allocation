import { numeric, pgTable, uuid } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { weeklyVerifications } from "./weeklyVerifications";

/**
 * One row per project a person's signals touched that week. Stores every
 * distribution the verification engine computed (not just planned/observed)
 * so the Employee Week API can render a full per-source breakdown without
 * recomputing distributions from raw activity_signals on every request.
 */
export const verificationProjects = pgTable("verification_projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  verificationId: uuid("verification_id")
    .notNull()
    .references(() => weeklyVerifications.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  plannedPercentage: numeric("planned_percentage", { precision: 5, scale: 2 }),
  jiraPercentage: numeric("jira_percentage", { precision: 5, scale: 2 }),
  calendarPercentage: numeric("calendar_percentage", { precision: 5, scale: 2 }),
  observedPercentage: numeric("observed_percentage", { precision: 5, scale: 2 }),
});

export type VerificationProject = typeof verificationProjects.$inferSelect;
export type NewVerificationProject = typeof verificationProjects.$inferInsert;
