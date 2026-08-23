CREATE TABLE `member_account_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventType` enum('account_paused','account_reactivated','deletion_requested','deletion_cancelled','data_export_requested','data_request_cancelled') NOT NULL,
	`requestId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `member_account_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `member_account_states` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`lifecycleStatus` enum('active','paused','deletion_requested') NOT NULL DEFAULT 'active',
	`previousProfileStatus` enum('draft','under_review','active','paused','suspended'),
	`previousSearchVisible` boolean,
	`pausedAt` timestamp,
	`deletionRequestedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_account_states_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_account_states_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `member_data_rights_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`requestType` enum('data_export','account_deletion') NOT NULL,
	`status` enum('requested','processing','ready','expired','cancelled','unavailable','failed') NOT NULL DEFAULT 'requested',
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`cancelledAt` timestamp,
	`expiresAt` timestamp,
	`safeSummary` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_data_rights_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `member_account_events` ADD CONSTRAINT `mae_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_account_events` ADD CONSTRAINT `mae_request_fk` FOREIGN KEY (`requestId`) REFERENCES `member_data_rights_requests`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_account_states` ADD CONSTRAINT `mas_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_data_rights_requests` ADD CONSTRAINT `mdrr_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `member_account_events_user_idx` ON `member_account_events` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `member_account_states_lifecycle_idx` ON `member_account_states` (`lifecycleStatus`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `member_data_rights_user_status_idx` ON `member_data_rights_requests` (`userId`,`requestType`,`status`,`updatedAt`);
