CREATE TYPE "public"."care_clinician_role" AS ENUM('clinician', 'admin');--> statement-breakpoint
CREATE TABLE "care_clinicians" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"clinic_id" varchar(128) NOT NULL,
	"role" "care_clinician_role" DEFAULT 'clinician' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
