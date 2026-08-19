ALTER TABLE "weekly_verifications" ALTER COLUMN "confidence" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "weekly_verifications" ADD COLUMN "reason" text NOT NULL;--> statement-breakpoint
ALTER TABLE "weekly_verifications" ADD COLUMN "distribution_gap" numeric(5, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "weekly_verifications" ADD COLUMN "review_status" text DEFAULT 'AWAITING_CONFIRMATION' NOT NULL;--> statement-breakpoint
ALTER TABLE "weekly_verifications" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_projects" ADD COLUMN "jira_percentage" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "verification_projects" ADD COLUMN "calendar_percentage" numeric(5, 2);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_signals_week_start_idx" ON "activity_signals" USING btree ("week_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "weekly_verifications_week_start_idx" ON "weekly_verifications" USING btree ("week_start");