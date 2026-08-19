import { date, index, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { people } from "./people";

/**
 * One row per (person, week). `status`/`confidence`/`reason`/`distributionGap`
 * are the machine analysis, recomputed on every sync. `reviewStatus` is the
 * separate human-review state (SPEC.md section 11 / Task 4 section 1) —
 * sync must never overwrite it once a human has confirmed or corrected.
 */
export const weeklyVerifications = pgTable(
  "weekly_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    weekStart: date("week_start").notNull(),

    // Machine analysis — recomputed by /api/sync each run.
    status: text("status").notNull(),
    confidence: text("confidence").notNull(),
    reason: text("reason").notNull(),
    distributionGap: numeric("distribution_gap", { precision: 5, scale: 2 }).notNull(),

    // Human review — set only by Confirm/Correct, preserved across re-sync.
    reviewStatus: text("review_status").notNull().default("AWAITING_CONFIRMATION"),

    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("weekly_verifications_person_week_unique").on(table.personId, table.weekStart),
    index("weekly_verifications_week_start_idx").on(table.weekStart),
  ],
);

export type WeeklyVerification = typeof weeklyVerifications.$inferSelect;
export type NewWeeklyVerification = typeof weeklyVerifications.$inferInsert;
