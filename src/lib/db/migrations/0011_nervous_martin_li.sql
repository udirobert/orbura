CREATE TABLE "wearable_observations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"source" varchar(64) NOT NULL,
	"metric_type" varchar(64) NOT NULL,
	"recorded_at" timestamp NOT NULL,
	"recorded_date" date NOT NULL,
	"value" real NOT NULL,
	"unit" varchar(32),
	"confidence" varchar(16),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "wearable_observations_user_source_metric_date_idx" ON "wearable_observations" USING btree ("user_id","source","metric_type","recorded_date");--> statement-breakpoint
CREATE INDEX "wearable_observations_user_metric_recorded_idx" ON "wearable_observations" USING btree ("user_id","metric_type","recorded_at");