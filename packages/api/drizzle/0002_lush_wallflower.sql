ALTER TABLE "orders" ADD COLUMN "zone_id" uuid;--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN "required_level" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN "hourly_fee" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zones" ADD CONSTRAINT "zones_slug_unique" UNIQUE("slug");