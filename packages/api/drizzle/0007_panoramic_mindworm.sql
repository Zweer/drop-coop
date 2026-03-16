CREATE TABLE "discovered_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovered_endpoints_player_id_endpoint_unique" UNIQUE("player_id","endpoint")
);
--> statement-breakpoint
ALTER TABLE "discovered_endpoints" ADD CONSTRAINT "discovered_endpoints_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;