CREATE TABLE "affiliate_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"guest_session_id" varchar(100),
	"original_url" text NOT NULL,
	"short_link" text NOT NULL,
	"platform_id" integer,
	"code" varchar(10) NOT NULL,
	"tracking_url" text NOT NULL,
	"meta_data" jsonb,
	"clicks" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "affiliate_links_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "platforms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"api_config" jsonb,
	"base_commission_share" numeric(5, 2) DEFAULT '70.00' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"platform_id" integer,
	"order_id_external" varchar(100),
	"order_amount" numeric(15, 2),
	"commission_received" numeric(15, 2),
	"cashback_amount" numeric(15, 2),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255),
	"password_hash" varchar,
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"wallet_balance" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_withdrawn" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"bank_name" varchar(100),
	"bank_account_number" varchar(50),
	"bank_account_holder" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "withdrawal_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"bank_snapshot" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"proof_image_url" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_links_user" ON "affiliate_links" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_links_guest" ON "affiliate_links" USING btree ("guest_session_id");--> statement-breakpoint
CREATE INDEX "idx_links_code" ON "affiliate_links" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_trans_order" ON "transactions" USING btree ("order_id_external");--> statement-breakpoint
CREATE INDEX "idx_withdraw_status" ON "withdrawal_requests" USING btree ("status");