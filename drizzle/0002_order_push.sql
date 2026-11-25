CREATE TABLE "order_push" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_push" ADD CONSTRAINT "order_push_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "order_push_order_endpoint_uniq" ON "order_push" USING btree ("order_id","endpoint");