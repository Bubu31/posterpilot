ALTER TABLE `media_items` ADD `added_at` integer;--> statement-breakpoint
ALTER TABLE `media_items` ADD `watched` integer DEFAULT false NOT NULL;