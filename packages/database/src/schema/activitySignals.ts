import { date, index, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { people } from "./people";
import { projects } from "./projects";

export const activitySignals = pgTable(
  "activity_signals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    activityType: text("activity_type").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
    weekStart: date("week_start").notNull(),
    evidenceJson: jsonb("evidence_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("activity_signals_week_start_idx").on(table.weekStart)],
);

export type ActivitySignal = typeof activitySignals.$inferSelect;
export type NewActivitySignal = typeof activitySignals.$inferInsert;
