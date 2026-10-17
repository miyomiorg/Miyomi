CREATE TABLE `admin_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text,
	`resource_name` text,
	`admin_id` text,
	`details` text,
	`created_at` text,
	FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_admin_logs_admin_id` ON `admin_logs` (`admin_id`);--> statement-breakpoint
CREATE INDEX `idx_admin_logs_created_at` ON `admin_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_id` text NOT NULL,
	`session_type` text NOT NULL,
	`ip_address` text,
	`os` text,
	`os_version` text,
	`browser` text,
	`browser_version` text,
	`device_type` text,
	`device_model` text,
	`device_vendor` text,
	`user_agent` text,
	`device_fingerprint` text,
	`city` text,
	`country` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_admin_sessions_admin_id` ON `admin_sessions` (`admin_id`);--> statement-breakpoint
CREATE TABLE `admins` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`user_id` text,
	`display_name` text,
	`avatar_url` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_admins_email` ON `admins` (`email`);--> statement-breakpoint
CREATE TABLE `app_group_memberships` (
	`app_id` text NOT NULL,
	`group_id` text NOT NULL,
	PRIMARY KEY(`app_id`, `group_id`),
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `compatibility_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `apps` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text,
	`description` text,
	`short_description` text,
	`author` text,
	`category` text,
	`status` text NOT NULL,
	`version` text,
	`platforms` text,
	`content_types` text,
	`tags` text,
	`compatible_with` text,
	`icon_url` text,
	`icon_color` text,
	`accent_color` text,
	`og_image_url` text,
	`download_url` text,
	`repo_url` text,
	`website_url` text,
	`discord_url` text,
	`upstream_url` text,
	`fork_of` text,
	`metadata` text,
	`social_urls` text,
	`tutorials` text,
	`seo_title` text,
	`seo_description` text,
	`download_count` integer,
	`likes_count` integer,
	`last_release_date` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_apps_slug` ON `apps` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_apps_status` ON `apps` (`status`);--> statement-breakpoint
CREATE INDEX `idx_apps_name` ON `apps` (`name`);--> statement-breakpoint
CREATE INDEX `idx_apps_category` ON `apps` (`category`);--> statement-breakpoint
CREATE TABLE `blog_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`excerpt` text,
	`content` text NOT NULL,
	`content_format` text NOT NULL,
	`category` text NOT NULL,
	`status` text NOT NULL,
	`tags` text,
	`author_id` text,
	`author_name` text,
	`author_role` text,
	`author_avatar_url` text,
	`thumbnail_url` text,
	`thumbnail_alt` text,
	`og_image_url` text,
	`seo_title` text,
	`seo_description` text,
	`is_pinned` integer,
	`views` integer,
	`published_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_blog_posts_slug` ON `blog_posts` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_blog_posts_status` ON `blog_posts` (`status`);--> statement-breakpoint
CREATE INDEX `idx_blog_posts_published_at` ON `blog_posts` (`published_at`);--> statement-breakpoint
CREATE INDEX `idx_blog_posts_category` ON `blog_posts` (`category`);--> statement-breakpoint
CREATE TABLE `bot_attack_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`reason` text NOT NULL,
	`country` text,
	`ip_address` text,
	`user_agent` text,
	`headers_dump` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_bot_attack_logs_created_at` ON `bot_attack_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `compatibility_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`color` text DEFAULT '#6366F1',
	`icon_url` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_groups_name` ON `compatibility_groups` (`name`);--> statement-breakpoint
CREATE TABLE `contributors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`contact` text,
	`contributions` text,
	`created_at` text
);
--> statement-breakpoint
CREATE TABLE `donation_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `donations` (
	`id` text PRIMARY KEY NOT NULL,
	`donor_name` text NOT NULL,
	`message` text,
	`amount` real,
	`currency` text,
	`date` text,
	`payment_method` text,
	`is_public` integer,
	`show_amount` integer,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_donations_created_at` ON `donations` (`created_at`);--> statement-breakpoint
CREATE TABLE `extension_group_memberships` (
	`extension_id` text NOT NULL,
	`group_id` text NOT NULL,
	PRIMARY KEY(`extension_id`, `group_id`),
	FOREIGN KEY (`extension_id`) REFERENCES `extensions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `compatibility_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `extensions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text,
	`description` text,
	`short_description` text,
	`author` text,
	`category` text,
	`status` text NOT NULL,
	`info` text,
	`language` text,
	`region` text,
	`auto_url` text,
	`manual_url` text,
	`source_url` text,
	`repo_url` text,
	`website_url` text,
	`discord_url` text,
	`platforms` text,
	`types` text,
	`tags` text,
	`compatible_with` text,
	`icon_url` text,
	`icon_color` text,
	`accent_color` text,
	`og_image_url` text,
	`metadata` text,
	`social_urls` text,
	`tutorials` text,
	`seo_title` text,
	`seo_description` text,
	`download_count` integer,
	`likes_count` integer,
	`last_updated` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_extensions_slug` ON `extensions` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_extensions_status` ON `extensions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_extensions_name` ON `extensions` (`name`);--> statement-breakpoint
CREATE TABLE `faqs` (
	`id` text PRIMARY KEY NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`category` text,
	`content_format` text,
	`legacy_id` text,
	`order_index` integer DEFAULT 0 NOT NULL,
	`tags` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_faqs_category` ON `faqs` (`category`);--> statement-breakpoint
CREATE INDEX `idx_faqs_order_index` ON `faqs` (`order_index`);--> statement-breakpoint
CREATE TABLE `feedbacks` (
	`id` text PRIMARY KEY NOT NULL,
	`message` text NOT NULL,
	`status` text NOT NULL,
	`feedback_type` text,
	`page_url` text,
	`user_id` text,
	`user_name` text,
	`user_contact` text,
	`reviewed_by` text,
	`reviewed_at` text,
	`admin_note` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_feedbacks_status` ON `feedbacks` (`status`);--> statement-breakpoint
CREATE INDEX `idx_feedbacks_created_at` ON `feedbacks` (`created_at`);--> statement-breakpoint
CREATE TABLE `guides` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text,
	`description` text,
	`content` text,
	`content_html` text,
	`content_format` text NOT NULL,
	`content_mode` text,
	`template_version` text,
	`author` text,
	`author_name` text,
	`author_avatar_url` text,
	`category` text,
	`related_apps` text,
	`related_extensions` text,
	`tags` text,
	`metadata` text,
	`og_image_url` text,
	`seo_title` text,
	`seo_description` text,
	`status` text NOT NULL,
	`published_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_guides_slug` ON `guides` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_guides_status` ON `guides` (`status`);--> statement-breakpoint
CREATE INDEX `idx_guides_published_at` ON `guides` (`published_at`);--> statement-breakpoint
CREATE TABLE `likes` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`item_type` text DEFAULT 'app' NOT NULL,
	`device_fingerprint` text NOT NULL,
	`anonymous_id` text,
	`browser` text,
	`browser_version` text,
	`device_model` text,
	`device_type` text,
	`device_vendor` text,
	`fingerprint_method` text,
	`ip_address` text,
	`ip_hash` text,
	`language` text,
	`os` text,
	`os_version` text,
	`referrer` text,
	`screen_resolution` text,
	`timezone` text,
	`user_agent` text,
	`user_agent_hash` text,
	`liked_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_likes_item_fingerprint` ON `likes` (`item_id`,`device_fingerprint`);--> statement-breakpoint
CREATE INDEX `idx_likes_item_lookup` ON `likes` (`item_id`,`item_type`);--> statement-breakpoint
CREATE INDEX `idx_likes_liked_at` ON `likes` (`liked_at`);--> statement-breakpoint
CREATE TABLE `moderator_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`resource` text NOT NULL,
	`can_read` integer DEFAULT true NOT NULL,
	`can_write` integer DEFAULT false NOT NULL,
	`can_delete` integer DEFAULT false NOT NULL,
	`granted_by` text,
	`created_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_mod_perms_user_resource` ON `moderator_permissions` (`user_id`,`resource`);--> statement-breakpoint
CREATE TABLE `notices` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`type` text NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`dismissible` integer DEFAULT true NOT NULL,
	`created_by` text,
	`start_date` text,
	`end_date` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_notices_active` ON `notices` (`active`);--> statement-breakpoint
CREATE INDEX `idx_notices_priority` ON `notices` (`priority`);--> statement-breakpoint
CREATE TABLE `public_edit_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`submitted_data` text NOT NULL,
	`original_data_snapshot` text NOT NULL,
	`approved_data` text,
	`status` text NOT NULL,
	`submitter_name` text,
	`submitter_contact` text,
	`submitter_user_id` text,
	`reviewed_by` text,
	`reviewed_at` text,
	`admin_note` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_pes_status` ON `public_edit_suggestions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_pes_target` ON `public_edit_suggestions` (`target_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`endpoint` text NOT NULL,
	`ip_address` text NOT NULL,
	`window_start` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_rate_limits_key` ON `rate_limits` (`ip_address`,`endpoint`,`window_start`);--> statement-breakpoint
CREATE INDEX `idx_rate_limits_created_at` ON `rate_limits` (`created_at`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reason` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text,
	`status` text NOT NULL,
	`message` text,
	`page_url` text,
	`reporter_name` text,
	`reporter_contact` text,
	`reporter_user_id` text,
	`anonymous_id` text,
	`device_fingerprint` text,
	`device_type` text,
	`ip_address` text,
	`os` text,
	`browser` text,
	`language` text,
	`screen_resolution` text,
	`timezone` text,
	`reviewed_by` text,
	`reviewed_at` text,
	`admin_note` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_reports_status` ON `reports` (`status`);--> statement-breakpoint
CREATE INDEX `idx_reports_target` ON `reports` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `idx_reports_created_at` ON `reports` (`created_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`category` text,
	`description` text,
	`is_sensitive` integer DEFAULT false NOT NULL,
	`updated_by` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_type` text NOT NULL,
	`status` text NOT NULL,
	`submitted_data` text NOT NULL,
	`author` text,
	`submitter_name` text,
	`submitter_email` text,
	`submitter_contact` text,
	`submitter_user_id` text,
	`duplicate_check_results` text,
	`recaptcha_score` real,
	`admin_notes` text,
	`reviewed_by` text,
	`reviewed_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_submissions_status` ON `submissions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_submissions_type` ON `submissions` (`submission_type`);--> statement-breakpoint
CREATE INDEX `idx_submissions_created_at` ON `submissions` (`created_at`);--> statement-breakpoint
CREATE TABLE `themes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`is_seasonal` integer DEFAULT false NOT NULL,
	`active_from` text,
	`active_to` text,
	`preview_image` text,
	`assets` text,
	`css_variables` text,
	`particle_config` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_themes_slug` ON `themes` (`slug`);--> statement-breakpoint
CREATE TABLE `unauthorized_login_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`auth_provider` text NOT NULL,
	`email` text,
	`browser` text,
	`browser_version` text,
	`city` text,
	`country` text,
	`device_fingerprint` text,
	`device_model` text,
	`device_type` text,
	`device_vendor` text,
	`ip_address` text,
	`os` text,
	`os_version` text,
	`user_agent` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ula_created_at` ON `unauthorized_login_attempts` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_ula_ip_address` ON `unauthorized_login_attempts` (`ip_address`);--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_user_roles_user_role` ON `user_roles` (`user_id`,`role`);