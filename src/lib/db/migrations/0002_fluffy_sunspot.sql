CREATE TABLE "user_preferences" (
	"user_id" varchar(128) PRIMARY KEY NOT NULL,
	"mode" text DEFAULT 'personal',
	"orb_personality" text DEFAULT 'honest',
	"locale" text DEFAULT 'en',
	"wake_time" text,
	"bed_time" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "squad_players" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"coach_id" varchar(128) NOT NULL,
	"name" text NOT NULL,
	"position" text,
	"jersey_number" integer,
	"analysis" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "anonymous_id" varchar(128);--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squad_players" ADD CONSTRAINT "squad_players_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "squad_players_coach_idx" ON "squad_players" USING btree ("coach_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_anonymous_id_idx" ON "users" USING btree ("anonymous_id");