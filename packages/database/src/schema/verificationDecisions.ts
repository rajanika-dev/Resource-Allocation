import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { weeklyVerifications } from "./weeklyVerifications";

export const verificationDecisions = pgTable("verification_decisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  verificationId: uuid("verification_id")
    .notNull()
    .references(() => weeklyVerifications.id, { onDelete: "cascade" }),
  decision: text("decision").notNull(),
  correctedAllocationsJson: jsonb("corrected_allocations_json"),
  comment: text("comment"),
  decidedBy: text("decided_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VerificationDecision = typeof verificationDecisions.$inferSelect;
export type NewVerificationDecision = typeof verificationDecisions.$inferInsert;
