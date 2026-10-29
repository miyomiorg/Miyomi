ALTER TABLE `admins` ADD `session_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `admins` ADD `totp_last_step` integer;