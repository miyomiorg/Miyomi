DROP INDEX `idx_admin_logs_admin_id`;--> statement-breakpoint
CREATE INDEX `idx_admin_logs_admin_created` ON `admin_logs` (`admin_id`,`created_at`);--> statement-breakpoint
DROP INDEX `idx_admin_sessions_admin_id`;--> statement-breakpoint
CREATE INDEX `idx_admin_sessions_admin_created` ON `admin_sessions` (`admin_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_admin_sessions_created_at` ON `admin_sessions` (`created_at`);--> statement-breakpoint
DROP INDEX `idx_apps_status`;--> statement-breakpoint
CREATE INDEX `idx_apps_status_name` ON `apps` (`status`,`name`);--> statement-breakpoint
CREATE INDEX `idx_apps_updated_at` ON `apps` (`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_apps_name_lower` ON `apps` (lower("name"));--> statement-breakpoint
CREATE INDEX `idx_apps_repo_lower` ON `apps` (lower("repo_url"));--> statement-breakpoint
DROP INDEX `idx_extensions_status`;--> statement-breakpoint
CREATE INDEX `idx_extensions_status_name` ON `extensions` (`status`,`name`);--> statement-breakpoint
CREATE INDEX `idx_extensions_updated_at` ON `extensions` (`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_extensions_name_lower` ON `extensions` (lower("name"));--> statement-breakpoint
CREATE INDEX `idx_extensions_repo_lower` ON `extensions` (lower("repo_url"));--> statement-breakpoint
DROP INDEX `idx_pes_status`;--> statement-breakpoint
CREATE INDEX `idx_pes_status_created` ON `public_edit_suggestions` (`status`,`created_at`);--> statement-breakpoint
DROP INDEX `idx_submissions_status`;--> statement-breakpoint
DROP INDEX `idx_submissions_type`;--> statement-breakpoint
CREATE INDEX `idx_submissions_status_created` ON `submissions` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_submissions_type_status` ON `submissions` (`submission_type`,`status`);--> statement-breakpoint
CREATE INDEX `idx_agm_group_app` ON `app_group_memberships` (`group_id`,`app_id`);--> statement-breakpoint
CREATE INDEX `idx_blog_posts_updated_at` ON `blog_posts` (`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_egm_group_ext` ON `extension_group_memberships` (`group_id`,`extension_id`);--> statement-breakpoint
CREATE INDEX `idx_guides_updated_at` ON `guides` (`updated_at`);