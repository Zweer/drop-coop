CREATE TABLE "rider_pool" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"name" text NOT NULL,
	"speed" integer NOT NULL,
	"reliability" integer NOT NULL,
	"city_knowledge" integer NOT NULL,
	"stamina" integer NOT NULL,
	"hire_cost" real NOT NULL,
	"salary" real NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rider_pool" ADD CONSTRAINT "rider_pool_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;