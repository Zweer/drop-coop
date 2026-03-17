CREATE TABLE "coop_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"policy_type" text NOT NULL,
	"option" text NOT NULL,
	"active_since" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coop_policies_player_id_policy_type_unique" UNIQUE("player_id","policy_type")
);
--> statement-breakpoint
ALTER TABLE "coop_policies" ADD CONSTRAINT "coop_policies_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;