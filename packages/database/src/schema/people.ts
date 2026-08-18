import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const people = pgTable("people", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  managerId: uuid("manager_id").references((): any => people.id, { onDelete: "set null" }),
  department: text("department"),
  role: text("role"),
  weeklyCapacityHours: integer("weekly_capacity_hours").notNull().default(40),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
