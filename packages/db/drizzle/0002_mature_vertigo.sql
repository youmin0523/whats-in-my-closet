CREATE TABLE "personal_color_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"season" text,
	"undertone" text,
	"value" text,
	"chroma" text,
	"palette" jsonb,
	"quiz_answers" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "plans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name_ko" text NOT NULL,
	"max_items" integer,
	"monthly_tryon_credits" integer DEFAULT 0 NOT NULL,
	"price_krw" integer DEFAULT 0 NOT NULL,
	"features" jsonb,
	CONSTRAINT "plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "recommendations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"for_date" date,
	"weather_snapshot" jsonb,
	"constraints" jsonb,
	"outfits" jsonb,
	"model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "try_on_results" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "try_on_results_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"base_photo_url" text,
	"garment_ids" integer[],
	"outfit_id" integer,
	"provider" text DEFAULT 'fashn' NOT NULL,
	"provider_job_id" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"result_url" text,
	"error" text,
	"cost_credits" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "personal_color_profiles" ADD CONSTRAINT "personal_color_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "try_on_results" ADD CONSTRAINT "try_on_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "try_on_results" ADD CONSTRAINT "try_on_results_outfit_id_outfits_id_fk" FOREIGN KEY ("outfit_id") REFERENCES "public"."outfits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recommendations_user_date_idx" ON "recommendations" USING btree ("user_id","for_date");--> statement-breakpoint
CREATE INDEX "try_on_user_status_idx" ON "try_on_results" USING btree ("user_id","status");