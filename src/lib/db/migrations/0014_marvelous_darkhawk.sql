CREATE TABLE "zk_credentials" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"source" varchar(32) NOT NULL,
	"model_id" varchar(64) NOT NULL,
	"score" real,
	"healthy" boolean,
	"input_digest" varchar(80),
	"prover" varchar(16) NOT NULL,
	"chain" varchar(16) NOT NULL,
	"tx_hash" varchar(80),
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "zk_credentials_user_idx" ON "zk_credentials" USING btree ("user_id","created_at");