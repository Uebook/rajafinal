-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
DO $$ BEGIN
 CREATE TYPE "public"."discount_type_enum" AS ENUM('FLAT', 'PERCENTAGE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."ledger_type_enum" AS ENUM('DEBIT', 'CREDIT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."order_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'CANCELLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_method_enum" AS ENUM('ONLINE', 'CASH', 'CHEQUE', 'MANUAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_status_enum" AS ENUM('INITIATED', 'SUCCESS', 'FAILED', 'REFUNDED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."product_status_enum" AS ENUM('ACTIVE', 'HIDDEN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."scheme_type_enum" AS ENUM('VOLUME', 'BUY_X_GET_Y');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."user_role_enum" AS ENUM('SUPER_ADMIN', 'ADMIN', 'VENDOR', 'RETAILER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."user_status_enum" AS ENUM('ACTIVE', 'BLOCKED', 'PENDING', 'CREDIT_BLOCKED', 'DEACTIVATED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alembic_version" (
	"version_num" varchar(32) PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"actor_id" uuid,
	"role" varchar(20) NOT NULL,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid,
	"diff_json" jsonb,
	"description" text,
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "carts" (
	"user_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "device_tokens" (
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" varchar(20) NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ledger_entries" (
	"user_id" uuid NOT NULL,
	"entry_type" "ledger_type_enum" NOT NULL,
	"amount" integer NOT NULL,
	"reference_type" varchar(50) NOT NULL,
	"reference_id" uuid NOT NULL,
	"description" text,
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"notification_type" varchar(50) NOT NULL,
	"reference_id" uuid,
	"is_read" boolean DEFAULT false NOT NULL,
	"delivery_status" varchar(20) DEFAULT 'pending'::character varying NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "otps" (
	"mobile" varchar(15) NOT NULL,
	"otp_hash" text NOT NULL,
	"purpose" varchar(30) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"user_id" uuid,
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "retailers" (
	"user_id" uuid NOT NULL,
	"business_name" varchar(255) NOT NULL,
	"owner_name" varchar(255) NOT NULL,
	"business_type" varchar(100),
	"gst_number" varchar(20),
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"pincode" varchar(10),
	"credit_limit" integer DEFAULT 0 NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "retailers_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendors" (
	"user_id" uuid NOT NULL,
	"business_name" varchar(255) NOT NULL,
	"gst_number" varchar(20),
	"pan_number" varchar(15),
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"pincode" varchar(10),
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "vendors_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cart_items" (
	"cart_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"price_snapshot" integer NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dealer_pricing" (
	"product_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"price" integer NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dealer_schemes" (
	"user_id" uuid,
	"scheme_type" "scheme_type_enum" NOT NULL,
	"product_id" uuid,
	"category_id" uuid,
	"min_qty" integer NOT NULL,
	"discount_pct" integer NOT NULL,
	"free_qty" integer NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"description" text,
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoices" (
	"order_id" uuid NOT NULL,
	"invoice_number" varchar(30) NOT NULL,
	"buyer_gstin" varchar(20),
	"seller_gstin" varchar(20),
	"subtotal" integer NOT NULL,
	"cgst" integer NOT NULL,
	"sgst" integer NOT NULL,
	"igst" integer NOT NULL,
	"grand_total" integer NOT NULL,
	"pdf_url" text,
	"is_manual" boolean DEFAULT false NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "invoices_invoice_number_key" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_items" (
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"gst_rate" integer NOT NULL,
	"line_total" integer NOT NULL,
	"gst_amount" integer NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"order_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"status" "payment_status_enum" DEFAULT 'INITIATED' NOT NULL,
	"method" "payment_method_enum" NOT NULL,
	"gateway_order_id" varchar(100),
	"gateway_payment_id" varchar(100),
	"gateway_signature" text,
	"notes" text,
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_images" (
	"product_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "retailer_pricing" (
	"product_id" uuid NOT NULL,
	"price" integer NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_pricing" (
	"product_id" uuid NOT NULL,
	"price" integer NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discount_codes" (
	"code" varchar(50) NOT NULL,
	"discount_type" "discount_type_enum" NOT NULL,
	"value" integer NOT NULL,
	"min_order_value" integer DEFAULT 0 NOT NULL,
	"max_usage_count" integer DEFAULT 0 NOT NULL,
	"current_usage" integer DEFAULT 0 NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"scope_type" varchar(20),
	"scope_id" uuid,
	"description" text,
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"mobile" varchar(15) NOT NULL,
	"email" varchar(255),
	"password_hash" text,
	"full_name" varchar(255) NOT NULL,
	"role" "user_role_enum" NOT NULL,
	"status" "user_status_enum" DEFAULT 'ACTIVE' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"geo_location" jsonb,
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"avatar_url" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"image_url" text,
	"parent_id" uuid,
	"visible_to_vendor" boolean DEFAULT true NOT NULL,
	"visible_to_retailer" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"depth" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"sku" varchar(50) NOT NULL,
	"description" text,
	"unit" varchar(50) NOT NULL,
	"hsn_code" varchar(20),
	"base_price" integer NOT NULL,
	"gst_rate" integer DEFAULT 18 NOT NULL,
	"stock_qty" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 10 NOT NULL,
	"status" "product_status_enum" DEFAULT 'ACTIVE' NOT NULL,
	"category_id" uuid NOT NULL,
	"search_vector" "tsvector",
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"sub_category_id" uuid,
	"return_policy" varchar(255),
	"return_window_days" integer DEFAULT 7 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"user_id" uuid NOT NULL,
	"order_number" varchar(30) NOT NULL,
	"status" "order_status_enum" DEFAULT 'PENDING' NOT NULL,
	"subtotal" integer NOT NULL,
	"gst_amount" integer NOT NULL,
	"discount_amount" integer NOT NULL,
	"grand_total" integer NOT NULL,
	"delivery_address" text,
	"discount_code_id" uuid,
	"voice_order" boolean DEFAULT false NOT NULL,
	"voice_clip_url" text,
	"eway_bill_no" varchar(50),
	"eway_bill_url" text,
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"return_reason" text,
	"return_image_url" varchar,
	CONSTRAINT "orders_order_number_key" UNIQUE("order_number")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "otps" ADD CONSTRAINT "otps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "retailers" ADD CONSTRAINT "retailers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vendors" ADD CONSTRAINT "vendors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dealer_pricing" ADD CONSTRAINT "dealer_pricing_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dealer_pricing" ADD CONSTRAINT "dealer_pricing_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dealer_schemes" ADD CONSTRAINT "dealer_schemes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dealer_schemes" ADD CONSTRAINT "dealer_schemes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dealer_schemes" ADD CONSTRAINT "dealer_schemes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "retailer_pricing" ADD CONSTRAINT "retailer_pricing_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vendor_pricing" ADD CONSTRAINT "vendor_pricing_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_discount_code_id_fkey" FOREIGN KEY ("discount_code_id") REFERENCES "public"."discount_codes"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_audit_actor_id" ON "audit_log" ("actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_audit_created_at" ON "audit_log" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_audit_entity" ON "audit_log" ("entity_id","entity_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_audit_log_is_deleted" ON "audit_log" ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_carts_is_deleted" ON "carts" ("is_deleted");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ix_carts_user_id" ON "carts" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_device_tokens_is_deleted" ON "device_tokens" ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_device_tokens_user_id" ON "device_tokens" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_ledger_created_at" ON "ledger_entries" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_ledger_entries_is_deleted" ON "ledger_entries" ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_ledger_user_id" ON "ledger_entries" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_notifications_is_deleted" ON "notifications" ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_notifications_user_id" ON "notifications" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_otps_is_deleted" ON "otps" ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_otps_mobile" ON "otps" ("mobile");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_refresh_tokens_is_deleted" ON "refresh_tokens" ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_refresh_tokens_user_id" ON "refresh_tokens" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_retailers_is_deleted" ON "retailers" ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_vendors_is_deleted" ON "vendors" ("is_deleted");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ix_cart_items_cart_product" ON "cart_items" ("cart_id","product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_cart_items_is_deleted" ON "cart_items" ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_dealer_pricing_is_deleted" ON "dealer_pricing" ("is_deleted");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ix_dealer_pricing_product_user" ON "dealer_pricing" ("product_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_dealer_schemes_is_deleted" ON "dealer_schemes" ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_dealer_schemes_user_id" ON "dealer_schemes" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_invoices_is_deleted" ON "invoices" ("is_deleted");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ix_invoices_number" ON "invoices" ("invoice_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_invoices_order_id" ON "invoices" ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_order_items_is_deleted" ON "order_items" ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_order_items_order_id" ON "order_items" ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_payments_is_deleted" ON "payments" ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_payments_order_id" ON "payments" ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_payments_user_id" ON "payments" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_product_images_is_deleted" ON "product_images" ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_product_images_product_id" ON "product_images" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_retailer_pricing_is_deleted" ON "retailer_pricing" ("is_deleted");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ix_retailer_pricing_product" ON "retailer_pricing" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_vendor_pricing_is_deleted" ON "vendor_pricing" ("is_deleted");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ix_vendor_pricing_product" ON "vendor_pricing" ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ix_discount_code" ON "discount_codes" ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_discount_codes_is_deleted" ON "discount_codes" ("is_deleted");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ix_users_email" ON "users" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_users_is_deleted" ON "users" ("is_deleted");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ix_users_mobile" ON "users" ("mobile");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_users_role" ON "users" ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_categories_is_deleted" ON "categories" ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_categories_parent_id" ON "categories" ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_categories_depth" ON "categories" ("depth");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ix_categories_root_slug" ON "categories" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ix_categories_slug_parent_id" ON "categories" ("parent_id","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_products_category_id" ON "products" ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_products_is_deleted" ON "products" ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_products_search" ON "products" ("search_vector");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ix_products_sku" ON "products" ("sku");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_products_sub_category_id" ON "products" ("sub_category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_orders_is_deleted" ON "orders" ("is_deleted");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ix_orders_order_number" ON "orders" ("order_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_orders_status" ON "orders" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_orders_user_id" ON "orders" ("user_id");
*/