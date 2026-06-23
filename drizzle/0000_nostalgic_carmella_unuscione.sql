CREATE TABLE `applied_posters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`media_item_id` integer NOT NULL,
	`url` text NOT NULL,
	`method` text NOT NULL,
	`status` text NOT NULL,
	`error` text,
	`applied_at` integer NOT NULL,
	FOREIGN KEY (`media_item_id`) REFERENCES `media_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `http_cache` (
	`url` text PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`processed` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`current_item` text,
	`error` text,
	`started_at` integer,
	`finished_at` integer
);
--> statement-breakpoint
CREATE TABLE `media_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rating_key` text NOT NULL,
	`section_key` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`year` integer,
	`tmdb_id` text,
	`imdb_id` text,
	`tvdb_id` text,
	`media_type` text,
	`current_poster_url` text,
	`has_mediux` integer,
	`resolved` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_items_rating_key_unique` ON `media_items` (`rating_key`);--> statement-breakpoint
CREATE TABLE `poster_candidates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`media_item_id` integer NOT NULL,
	`set_id` text NOT NULL,
	`url` text NOT NULL,
	`kind` text NOT NULL,
	`season` integer,
	`episode` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`media_item_id`) REFERENCES `media_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
