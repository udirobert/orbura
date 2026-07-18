CREATE TABLE "care_clinics" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
