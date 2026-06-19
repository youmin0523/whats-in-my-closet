ALTER TABLE "garment_colors" ADD COLUMN "color_family" text;--> statement-breakpoint
CREATE INDEX "garment_colors_family_idx" ON "garment_colors" USING btree ("color_family");