CREATE TABLE "debt_sessions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"stressors" json,
	"face_analysis" json,
	"hrv_data" json,
	"debt_score" integer NOT NULL,
	"verdict" text NOT NULL,
	"recovery_time" text,
	"prescription" json,
	"stressor_breakdown" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"email" varchar(256),
	"name" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "terra_connections" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" varchar(128),
	"terra_user_id" varchar(256) NOT NULL,
	"provider" varchar(64) NOT NULL,
	"reference_id" varchar(256),
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"last_sync_at" timestamp,
	CONSTRAINT "terra_connections_terra_user_id_unique" UNIQUE("terra_user_id")
);
--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");