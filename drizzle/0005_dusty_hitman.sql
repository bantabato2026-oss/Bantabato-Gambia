CREATE TABLE `conversation_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`actorProfileId` int,
	`eventType` enum('mutual_interest','conversation_started','message_sent','voice_note_sent','message_read','conversation_paused','conversation_restricted','conversation_closed','safety_reported','member_blocked') NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversation_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversation_interaction_signals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`profileId` int NOT NULL,
	`firstParticipatedAt` timestamp,
	`lastParticipatedAt` timestamp,
	`messagesSent` int NOT NULL DEFAULT 0,
	`voiceNotesSent` int NOT NULL DEFAULT 0,
	`readEvents` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversation_interaction_signals_id` PRIMARY KEY(`id`),
	CONSTRAINT `conversation_interaction_signals_unique` UNIQUE(`conversationId`,`profileId`)
);
--> statement-breakpoint
CREATE TABLE `conversation_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`profileId` int NOT NULL,
	`isMuted` boolean NOT NULL DEFAULT false,
	`readReceiptsEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversation_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `conversation_preferences_unique` UNIQUE(`conversationId`,`profileId`)
);
--> statement-breakpoint
CREATE TABLE `message_reads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` int NOT NULL,
	`readerProfileId` int NOT NULL,
	`readAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `message_reads_id` PRIMARY KEY(`id`),
	CONSTRAINT `message_reads_unique` UNIQUE(`messageId`,`readerProfileId`)
);
--> statement-breakpoint
ALTER TABLE `conversations` MODIFY COLUMN `status` enum('mutual_interest','active','paused','archived','blocked','reported','restricted','closed') NOT NULL DEFAULT 'mutual_interest';--> statement-breakpoint
ALTER TABLE `conversations` ADD `mutualInterestAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `lastActivityAt` timestamp;--> statement-breakpoint
ALTER TABLE `conversations` ADD `restrictedAt` timestamp;--> statement-breakpoint
ALTER TABLE `conversations` ADD `closedAt` timestamp;--> statement-breakpoint
ALTER TABLE `messages` ADD `mimeType` varchar(100);--> statement-breakpoint
ALTER TABLE `messages` ADD `durationSeconds` int;--> statement-breakpoint
ALTER TABLE `messages` ADD `deliveryStatus` enum('sent','delivered','failed') DEFAULT 'sent' NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `deliveredAt` timestamp;--> statement-breakpoint
ALTER TABLE `messages` ADD `failureReason` varchar(500);--> statement-breakpoint
ALTER TABLE `messages` ADD `retryOfMessageId` int;--> statement-breakpoint
ALTER TABLE `messages` ADD `moderationStatus` enum('normal','flagged','under_review','restricted') DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `reportCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `metadata` json;--> statement-breakpoint
ALTER TABLE `reports` ADD `messageId` int;--> statement-breakpoint
ALTER TABLE `conversation_events` ADD CONSTRAINT `conversation_events_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversation_events` ADD CONSTRAINT `conversation_events_actorProfileId_member_profiles_id_fk` FOREIGN KEY (`actorProfileId`) REFERENCES `member_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversation_interaction_signals` ADD CONSTRAINT `cis_conv_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversation_interaction_signals` ADD CONSTRAINT `cis_profile_fk` FOREIGN KEY (`profileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversation_preferences` ADD CONSTRAINT `cp_conv_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversation_preferences` ADD CONSTRAINT `cp_profile_fk` FOREIGN KEY (`profileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_reads` ADD CONSTRAINT `mr_message_fk` FOREIGN KEY (`messageId`) REFERENCES `messages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_reads` ADD CONSTRAINT `mr_profile_fk` FOREIGN KEY (`readerProfileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `conversation_events_timeline_idx` ON `conversation_events` (`conversationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `conversation_events_actor_idx` ON `conversation_events` (`actorProfileId`,`eventType`,`createdAt`);--> statement-breakpoint
CREATE INDEX `conversation_interaction_profile_idx` ON `conversation_interaction_signals` (`profileId`,`lastParticipatedAt`);--> statement-breakpoint
CREATE INDEX `conversation_preferences_profile_idx` ON `conversation_preferences` (`profileId`,`isMuted`);--> statement-breakpoint
CREATE INDEX `message_reads_reader_idx` ON `message_reads` (`readerProfileId`,`readAt`);--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_message_fk` FOREIGN KEY (`messageId`) REFERENCES `messages`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `conversations_status_activity_idx` ON `conversations` (`status`,`lastActivityAt`);--> statement-breakpoint
CREATE INDEX `messages_sender_idx` ON `messages` (`senderProfileId`,`createdAt`);
