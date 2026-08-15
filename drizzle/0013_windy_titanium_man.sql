CREATE TABLE `member_notification_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`timezone` varchar(64) NOT NULL DEFAULT 'UTC',
	`quietHoursEnabled` boolean NOT NULL DEFAULT false,
	`quietHoursStart` varchar(5),
	`quietHoursEnd` varchar(5),
	`locale` varchar(16) NOT NULL DEFAULT 'en',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_notification_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_notification_settings_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `notification_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notificationId` int,
	`notificationEventId` int NOT NULL,
	`recipientUserId` int NOT NULL,
	`channel` enum('in_app','email','sms','push') NOT NULL,
	`provider` varchar(80),
	`templateVersion` varchar(64),
	`status` enum('pending','queued','sending','delivered','failed','retrying','suppressed','cancelled','expired','unavailable') NOT NULL DEFAULT 'pending',
	`providerMessageId` varchar(191),
	`failureReason` varchar(500),
	`retryCount` int NOT NULL DEFAULT 0,
	`nextRetryAt` timestamp,
	`scheduledAt` timestamp,
	`sentAt` timestamp,
	`deliveredAt` timestamp,
	`failedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_deliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_deliveries_event_channel_unique` UNIQUE(`notificationEventId`,`channel`)
);
--> statement-breakpoint
CREATE TABLE `notification_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientUserId` int NOT NULL,
	`actorUserId` int,
	`eventType` varchar(100) NOT NULL,
	`notificationType` varchar(40) NOT NULL,
	`notificationClass` enum('transactional','marketing') NOT NULL DEFAULT 'transactional',
	`priority` enum('critical','high','normal','low') NOT NULL DEFAULT 'normal',
	`sourceType` varchar(80),
	`sourceId` varchar(128),
	`idempotencyKey` varchar(191) NOT NULL,
	`safeMetadata` json,
	`actionPath` varchar(255),
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_events_idempotency_unique` UNIQUE(`recipientUserId`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `notification_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notificationDeliveryId` int NOT NULL,
	`status` enum('queued','processing','completed','failed','cancelled','expired') NOT NULL DEFAULT 'queued',
	`priority` enum('critical','high','normal','low') NOT NULL DEFAULT 'normal',
	`availableAt` timestamp NOT NULL DEFAULT (now()),
	`attempts` int NOT NULL DEFAULT 0,
	`maxAttempts` int NOT NULL DEFAULT 3,
	`lastError` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_jobs_delivery_unique` UNIQUE(`notificationDeliveryId`)
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` enum('messages','family','recommendations','billing','product_updates','marketing','security','verification','safety') NOT NULL,
	`inAppEnabled` boolean NOT NULL DEFAULT true,
	`emailEnabled` boolean NOT NULL DEFAULT true,
	`smsEnabled` boolean NOT NULL DEFAULT false,
	`pushEnabled` boolean NOT NULL DEFAULT false,
	`marketingOptIn` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_preferences_category_unique` UNIQUE(`userId`,`category`)
);
--> statement-breakpoint
CREATE TABLE `notification_provider_configurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(80) NOT NULL,
	`channel` enum('email','sms','push') NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`supportedLocales` json NOT NULL,
	`configurationNote` varchar(500),
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_provider_configurations_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_provider_channel_unique` UNIQUE(`provider`,`channel`)
);
--> statement-breakpoint
CREATE TABLE `notification_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`channel` enum('in_app','email','sms','push') NOT NULL,
	`locale` varchar(16) NOT NULL DEFAULT 'en',
	`templateVersion` varchar(64) NOT NULL,
	`status` enum('draft','active','retired') NOT NULL DEFAULT 'draft',
	`subject` varchar(160) NOT NULL,
	`body` varchar(500) NOT NULL,
	`allowedVariables` json NOT NULL,
	`createdByUserId` int,
	`activatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_templates_version_unique` UNIQUE(`eventType`,`channel`,`locale`,`templateVersion`)
);
--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `notificationType` enum('interest','match','message','verification','safety','family','connection','recommendation','billing','product','security') NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD `eventType` varchar(100);--> statement-breakpoint
ALTER TABLE `notifications` ADD `priority` enum('critical','high','normal','low') DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD `notificationClass` enum('transactional','marketing') DEFAULT 'transactional' NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD `templateVersion` varchar(64);--> statement-breakpoint
ALTER TABLE `notifications` ADD `dismissedAt` timestamp;--> statement-breakpoint
ALTER TABLE `notifications` ADD `expiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `member_notification_settings` ADD CONSTRAINT `mns_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_deliveries` ADD CONSTRAINT `nd_note_fk` FOREIGN KEY (`notificationId`) REFERENCES `notifications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_deliveries` ADD CONSTRAINT `nd_event_fk` FOREIGN KEY (`notificationEventId`) REFERENCES `notification_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_deliveries` ADD CONSTRAINT `nd_user_fk` FOREIGN KEY (`recipientUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_events` ADD CONSTRAINT `ne_recipient_fk` FOREIGN KEY (`recipientUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_events` ADD CONSTRAINT `ne_actor_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_jobs` ADD CONSTRAINT `nj_delivery_fk` FOREIGN KEY (`notificationDeliveryId`) REFERENCES `notification_deliveries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD CONSTRAINT `np_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_provider_configurations` ADD CONSTRAINT `npc_user_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_templates` ADD CONSTRAINT `nt_user_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `notification_deliveries_operations_idx` ON `notification_deliveries` (`status`,`nextRetryAt`,`createdAt`);--> statement-breakpoint
CREATE INDEX `notification_deliveries_recipient_idx` ON `notification_deliveries` (`recipientUserId`,`channel`,`createdAt`);--> statement-breakpoint
CREATE INDEX `notification_events_recipient_idx` ON `notification_events` (`recipientUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `notification_events_type_idx` ON `notification_events` (`eventType`,`createdAt`);--> statement-breakpoint
CREATE INDEX `notification_jobs_due_idx` ON `notification_jobs` (`status`,`availableAt`,`priority`);--> statement-breakpoint
CREATE INDEX `notification_templates_active_idx` ON `notification_templates` (`eventType`,`channel`,`status`);--> statement-breakpoint
CREATE INDEX `notifications_event_type_idx` ON `notifications` (`userId`,`eventType`,`createdAt`);
