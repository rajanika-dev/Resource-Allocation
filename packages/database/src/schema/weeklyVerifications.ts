import { date, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { people } from "./people";

export const weeklyVerifications = pgTable(
  "weekly_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    weekStart: date("week_start").notNull(),
    status: text("status").notNull(),
    confidence: text("confidence"),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("weekly_verifications_person_week_unique").on(table.personId, table.weekStart)],
);

export type WeeklyVerification = typeof weeklyVerifications.$inferSelect;
export type NewWeeklyVerification = typeof weeklyVerifications.$inferInsert;
