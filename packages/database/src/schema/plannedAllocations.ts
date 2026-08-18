import { date, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { people } from "./people";
import { projects } from "./projects";

export const plannedAllocations = pgTable("planned_allocations", {
  id: uuid("id").defaultRandom().primaryKey(),
  personId: uuid("person_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull(),
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to"),
  source: text("source").notNull().default("seed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PlannedAllocation = typeof plannedAllocations.$inferSelect;
export type NewPlannedAllocation = typeof plannedAllocations.$inferInsert;
