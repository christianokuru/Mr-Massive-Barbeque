CREATE TABLE "address" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"label" text NOT NULL,
	"line1" text NOT NULL,
	"area" text NOT NULL,
	"zone_id" integer,
	"phone" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"email" text,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reminders_sent" integer DEFAULT 0 NOT NULL,
	"last_reminder_at" timestamp with time zone,
	"converted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_reminders_chk" CHECK ("cart"."reminders_sent" between 0 and 2)
);
--> statement-breakpoint
CREATE TABLE "cart_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"cart_id" text NOT NULL,
	"variant_id" integer,
	"combo_id" integer,
	"qty" integer NOT NULL,
	CONSTRAINT "cart_item_qty_chk" CHECK ("cart_item"."qty" between 1 and 20),
	CONSTRAINT "cart_item_one_chk" CHECK (("cart_item"."variant_id" is null) <> ("cart_item"."combo_id" is null))
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "combo" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_url" text,
	"price_kobo" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "combo_slug_unique" UNIQUE("slug"),
	CONSTRAINT "combo_price_chk" CHECK ("combo"."price_kobo" > 0)
);
--> statement-breakpoint
CREATE TABLE "combo_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"combo_id" integer NOT NULL,
	"variant_id" integer NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "combo_item_qty_chk" CHECK ("combo_item"."qty" between 1 and 20)
);
--> statement-breakpoint
CREATE TABLE "coupon" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"kind" text NOT NULL,
	"value" integer NOT NULL,
	"min_subtotal_kobo" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"influencer" text,
	"owner_email" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupon_code_unique" UNIQUE("code"),
	CONSTRAINT "coupon_kind_chk" CHECK ("coupon"."kind" in ('percent','fixed')),
	CONSTRAINT "coupon_value_chk" CHECK (("coupon"."kind" = 'percent' and "coupon"."value" between 1 and 100) or ("coupon"."kind" = 'fixed' and "coupon"."value" > 0)),
	CONSTRAINT "coupon_used_chk" CHECK ("coupon"."used_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "coupon_redemption" (
	"id" serial PRIMARY KEY NOT NULL,
	"coupon_id" integer NOT NULL,
	"email" text NOT NULL,
	"order_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favourite" (
	"user_id" text NOT NULL,
	"product_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favourite_user_id_product_id_pk" PRIMARY KEY("user_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "occasion" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"blurb" text DEFAULT '' NOT NULL,
	"image_url" text,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "occasion_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"user_id" text,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"name" text NOT NULL,
	"method" text NOT NULL,
	"address_line" text,
	"area" text,
	"zone_id" integer,
	"zone_name" text,
	"notes" text,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"subtotal_kobo" integer NOT NULL,
	"discount_kobo" integer DEFAULT 0 NOT NULL,
	"delivery_kobo" integer DEFAULT 0 NOT NULL,
	"total_kobo" integer NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"coupon_id" integer,
	"coupon_code" text,
	"referral_code" text,
	"payment_expires_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"tracking" text,
	"status_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_number_unique" UNIQUE("number"),
	CONSTRAINT "order_method_chk" CHECK ("order"."method" in ('delivery','pickup')),
	CONSTRAINT "order_status_chk" CHECK ("order"."status" in ('pending_payment','confirmed','preparing','out_for_delivery','delivered','cancelled','expired','refunded')),
	CONSTRAINT "order_money_chk" CHECK ("order"."subtotal_kobo" >= 0 and "order"."discount_kobo" >= 0 and "order"."delivery_kobo" >= 0 and "order"."total_kobo" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"type" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"note" text,
	"actor" text DEFAULT 'system' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer,
	"variant_id" integer,
	"combo_id" integer,
	"name" text NOT NULL,
	"size" text DEFAULT '' NOT NULL,
	"image_url" text,
	"unit_kobo" integer NOT NULL,
	"qty" integer NOT NULL,
	CONSTRAINT "order_item_qty_chk" CHECK ("order_item"."qty" between 1 and 50),
	CONSTRAINT "order_item_unit_chk" CHECK ("order_item"."unit_kobo" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_reservation" (
	"order_id" integer NOT NULL,
	"variant_id" integer NOT NULL,
	"qty" integer NOT NULL,
	CONSTRAINT "order_reservation_order_id_variant_id_pk" PRIMARY KEY("order_id","variant_id"),
	CONSTRAINT "reservation_qty_chk" CHECK ("order_reservation"."qty" > 0)
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"provider" text DEFAULT 'paystack' NOT NULL,
	"reference" text NOT NULL,
	"amount_kobo" integer NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"channel" text,
	"paid_amount_kobo" integer,
	"flagged" text,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone,
	CONSTRAINT "payment_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category_id" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"spice_level" integer DEFAULT 1 NOT NULL,
	"reorder_days" integer DEFAULT 7 NOT NULL,
	"is_side" boolean DEFAULT false NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_slug_unique" UNIQUE("slug"),
	CONSTRAINT "product_status_chk" CHECK ("product"."status" in ('draft','active','archived')),
	CONSTRAINT "product_spice_chk" CHECK ("product"."spice_level" between 0 and 3),
	CONSTRAINT "product_reorder_chk" CHECK ("product"."reorder_days" between 1 and 90)
);
--> statement-breakpoint
CREATE TABLE "product_image" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"url" text NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_occasion" (
	"product_id" integer NOT NULL,
	"occasion_id" integer NOT NULL,
	CONSTRAINT "product_occasion_product_id_occasion_id_pk" PRIMARY KEY("product_id","occasion_id")
);
--> statement-breakpoint
CREATE TABLE "product_side" (
	"product_id" integer NOT NULL,
	"side_product_id" integer NOT NULL,
	CONSTRAINT "product_side_product_id_side_product_id_pk" PRIMARY KEY("product_id","side_product_id")
);
--> statement-breakpoint
CREATE TABLE "product_variant" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"price_kobo" integer NOT NULL,
	"compare_at_kobo" integer,
	"stock" integer DEFAULT 0 NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "product_variant_sku_unique" UNIQUE("sku"),
	CONSTRAINT "variant_price_chk" CHECK ("product_variant"."price_kobo" > 0),
	CONSTRAINT "variant_compare_chk" CHECK ("product_variant"."compare_at_kobo" is null or "product_variant"."compare_at_kobo" > "product_variant"."price_kobo"),
	CONSTRAINT "variant_stock_chk" CHECK ("product_variant"."stock" >= 0)
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"phone" text,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscription" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscription_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "quiz_result" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"email" text,
	"answers" jsonb NOT NULL,
	"product_ids" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_code" (
	"user_id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_code_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "referral_reward" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_user_id" text NOT NULL,
	"referee_email" text NOT NULL,
	"order_id" integer,
	"reward_coupon_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminder_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"user_id" text,
	"order_id" integer,
	"author_name" text NOT NULL,
	"rating" integer NOT NULL,
	"spice_level" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_rating_chk" CHECK ("review"."rating" between 1 and 5),
	CONSTRAINT "review_status_chk" CHECK ("review"."status" in ('pending','approved','rejected')),
	CONSTRAINT "review_spice_chk" CHECK ("review"."spice_level" in ('mild','hot','extra_hot'))
);
--> statement-breakpoint
CREATE TABLE "shipping_zone" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"areas" text DEFAULT '' NOT NULL,
	"fee_kobo" integer NOT NULL,
	"free_over_kobo" integer,
	"eta_text" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "zone_fee_chk" CHECK ("shipping_zone"."fee_kobo" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock_alert" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"variant_id" integer NOT NULL,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriber" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"source" text DEFAULT 'newsletter' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriber_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "address" ADD CONSTRAINT "address_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "address" ADD CONSTRAINT "address_zone_id_shipping_zone_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."shipping_zone"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_cart_id_cart_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."cart"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_variant_id_product_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_combo_id_combo_id_fk" FOREIGN KEY ("combo_id") REFERENCES "public"."combo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combo_item" ADD CONSTRAINT "combo_item_combo_id_combo_id_fk" FOREIGN KEY ("combo_id") REFERENCES "public"."combo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combo_item" ADD CONSTRAINT "combo_item_variant_id_product_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemption" ADD CONSTRAINT "coupon_redemption_coupon_id_coupon_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemption" ADD CONSTRAINT "coupon_redemption_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourite" ADD CONSTRAINT "favourite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourite" ADD CONSTRAINT "favourite_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_zone_id_shipping_zone_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."shipping_zone"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_coupon_id_coupon_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupon"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_event" ADD CONSTRAINT "order_event_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_variant_id_product_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_combo_id_combo_id_fk" FOREIGN KEY ("combo_id") REFERENCES "public"."combo"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_reservation" ADD CONSTRAINT "order_reservation_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_reservation" ADD CONSTRAINT "order_reservation_variant_id_product_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_occasion" ADD CONSTRAINT "product_occasion_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_occasion" ADD CONSTRAINT "product_occasion_occasion_id_occasion_id_fk" FOREIGN KEY ("occasion_id") REFERENCES "public"."occasion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_side" ADD CONSTRAINT "product_side_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_side" ADD CONSTRAINT "product_side_side_product_id_product_id_fk" FOREIGN KEY ("side_product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_result" ADD CONSTRAINT "quiz_result_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_code" ADD CONSTRAINT "referral_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_reward" ADD CONSTRAINT "referral_reward_referrer_user_id_user_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_reward" ADD CONSTRAINT "referral_reward_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_reward" ADD CONSTRAINT "referral_reward_reward_coupon_id_coupon_id_fk" FOREIGN KEY ("reward_coupon_id") REFERENCES "public"."coupon"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_alert" ADD CONSTRAINT "stock_alert_variant_id_product_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "address_user_idx" ON "address" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cart_user_idx" ON "cart" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_item_variant_uniq" ON "cart_item" USING btree ("cart_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_item_combo_uniq" ON "cart_item" USING btree ("cart_id","combo_id");--> statement-breakpoint
CREATE UNIQUE INDEX "combo_item_uniq" ON "combo_item" USING btree ("combo_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "redemption_once_per_email" ON "coupon_redemption" USING btree ("coupon_id","email");--> statement-breakpoint
CREATE INDEX "order_user_idx" ON "order" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "order_email_idx" ON "order" USING btree ("email");--> statement-breakpoint
CREATE INDEX "order_status_idx" ON "order" USING btree ("status");--> statement-breakpoint
CREATE INDEX "order_created_idx" ON "order" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "order_event_order_idx" ON "order_event" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_item_order_idx" ON "order_item" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payment_order_idx" ON "payment" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "product_category_idx" ON "product" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "image_product_idx" ON "product_image" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "variant_product_idx" ON "product_variant" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "quiz_user_idx" ON "quiz_result" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_referee_uniq" ON "referral_reward" USING btree ("referee_email");--> statement-breakpoint
CREATE UNIQUE INDEX "reminder_log_uniq" ON "reminder_log" USING btree ("kind","key");--> statement-breakpoint
CREATE UNIQUE INDEX "review_user_product_uniq" ON "review" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "review_product_idx" ON "review" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_alert_uniq" ON "stock_alert" USING btree ("email","variant_id");