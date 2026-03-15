ALTER TABLE "players" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "github_id" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "google_id" text;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_github_id_unique" UNIQUE("github_id");--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_google_id_unique" UNIQUE("google_id");