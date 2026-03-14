CREATE TYPE "public"."order_status" AS ENUM('available', 'assigned', 'picked_up', 'delivered', 'expired');--> statement-breakpoint
CREATE TYPE "public"."order_urgency" AS ENUM('normal', 'urgent', 'express');--> statement-breakpoint
CREATE TYPE "public"."rider_status" AS ENUM('idle', 'delivering', 'resting');--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"rider_id" uuid,
	"pickup_lat" real NOT NULL,
	"pickup_lng" real NOT NULL,
	"dropoff_lat" real NOT NULL,
	"dropoff_lng" real NOT NULL,
	"distance" real NOT NULL,
	"urgency" "order_urgency" DEFAULT 'normal' NOT NULL,
	"status" "order_status" DEFAULT 'available' NOT NULL,
	"reward" real NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"assigned_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"zone_id" uuid NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"money" real DEFAULT 500 NOT NULL,
	"reputation" real DEFAULT 50 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"total_deliveries" integer DEFAULT 0 NOT NULL,
	"total_profit" real DEFAULT 0 NOT NULL,
	"last_tick_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "riders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"name" text NOT NULL,
	"speed" integer NOT NULL,
	"reliability" integer NOT NULL,
	"city_knowledge" integer NOT NULL,
	"stamina" integer NOT NULL,
	"energy" real DEFAULT 100 NOT NULL,
	"morale" real DEFAULT 75 NOT NULL,
	"status" "rider_status" DEFAULT 'idle' NOT NULL,
	"salary" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"demand_level" integer NOT NULL,
	"traffic_density" integer NOT NULL,
	"unlock_cost" real NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_zones" ADD CONSTRAINT "player_zones_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_zones" ADD CONSTRAINT "player_zones_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;