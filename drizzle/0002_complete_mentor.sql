CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"status" varchar(20) DEFAULT 'published' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"show_in_footer" boolean DEFAULT false NOT NULL,
	"show_in_header" boolean DEFAULT false NOT NULL,
	"seo_title" varchar(255),
	"seo_description" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "post_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"color" varchar(7) DEFAULT '#6366f1',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid,
	"category_id" integer,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"thumbnail_url" text,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"seo_title" varchar(255),
	"seo_description" varchar(500),
	"view_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_category_id_post_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."post_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pages_slug" ON "pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_posts_slug" ON "posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_posts_status" ON "posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_posts_category" ON "posts" USING btree ("category_id");