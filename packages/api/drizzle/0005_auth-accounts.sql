CREATE TYPE "public"."auth_type" AS ENUM('password', 'github', 'google');--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"type" "auth_type" NOT NULL,
	"provider_id" text,
	"credential" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_accounts_type_provider_id_unique" UNIQUE("type","provider_id")
);
--> statement-breakpoint
ALTER TABLE "players" DROP CONSTRAINT "players_github_id_unique";--> statement-breakpoint
ALTER TABLE "players" DROP CONSTRAINT "players_google_id_unique";--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Migrate existing password hashes to auth_accounts
INSERT INTO "auth_accounts" ("player_id", "type", "provider_id", "credential")
SELECT "id", 'password', "id"::text, "password_hash"
FROM "players" WHERE "password_hash" IS NOT NULL;--> statement-breakpoint
-- Migrate existing GitHub accounts
INSERT INTO "auth_accounts" ("player_id", "type", "provider_id")
SELECT "id", 'github', "github_id"
FROM "players" WHERE "github_id" IS NOT NULL;--> statement-breakpoint
-- Migrate existing Google accounts
INSERT INTO "auth_accounts" ("player_id", "type", "provider_id")
SELECT "id", 'google', "google_id"
FROM "players" WHERE "google_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "players" DROP COLUMN "password_hash";--> statement-breakpoint
ALTER TABLE "players" DROP COLUMN "github_id";--> statement-breakpoint
ALTER TABLE "players" DROP COLUMN "google_id";