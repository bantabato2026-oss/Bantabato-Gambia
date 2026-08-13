CREATE TABLE `admin_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`scope` enum('verification_reviewer','trust_safety','support_agent','subscription_manager','platform_admin') NOT NULL,
	`status` enum('active','revoked') NOT NULL DEFAULT 'active',
	`grantedByUserId` int,
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	CONSTRAINT `admin_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_roles_user_scope_unique` UNIQUE(`userId`,`scope`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`action` varchar(120) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` varchar(120),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blockerProfileId` int NOT NULL,
	`blockedProfileId` int NOT NULL,
	`reason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blocks_id` PRIMARY KEY(`id`),
	CONSTRAINT `blocks_direction_unique` UNIQUE(`blockerProfileId`,`blockedProfileId`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`status` enum('active','archived','blocked') NOT NULL DEFAULT 'active',
	`lastMessageAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`),
	CONSTRAINT `conversations_match_unique` UNIQUE(`matchId`)
);
--> statement-breakpoint
CREATE TABLE `family_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberProfileId` int NOT NULL,
	`relationship` enum('parent','wali_guardian') NOT NULL,
	`contactName` varchar(160) NOT NULL,
	`contactEmail` varchar(320),
	`contactPhone` varchar(40),
	`status` enum('draft','invited','accepted','revoked') NOT NULL DEFAULT 'draft',
	`canReceiveMatchNotifications` boolean NOT NULL DEFAULT false,
	`consentedAt` timestamp,
	`invitedAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `family_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `interest_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderProfileId` int NOT NULL,
	`recipientProfileId` int NOT NULL,
	`message` varchar(500),
	`status` enum('pending','accepted','declined','withdrawn') NOT NULL DEFAULT 'pending',
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `interest_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `interest_requests_direction_unique` UNIQUE(`senderProfileId`,`recipientProfileId`)
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberOneProfileId` int NOT NULL,
	`memberTwoProfileId` int NOT NULL,
	`status` enum('active','closed','blocked') NOT NULL DEFAULT 'active',
	`matchedAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matches_id` PRIMARY KEY(`id`),
	CONSTRAINT `matches_pair_unique` UNIQUE(`memberOneProfileId`,`memberTwoProfileId`)
);
--> statement-breakpoint
CREATE TABLE `member_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`minAge` int,
	`maxAge` int,
	`preferredReligions` json,
	`preferredLocations` json,
	`preferredTribes` json,
	`preferredEducationLevels` json,
	`marriageIntent` text,
	`mustHaves` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_preferences_profile_unique` UNIQUE(`profileId`)
);
--> statement-breakpoint
CREATE TABLE `member_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(80),
	`profileStatus` enum('draft','under_review','active','paused','suspended') NOT NULL DEFAULT 'draft',
	`birthDate` date,
	`gender` enum('woman','man','self_described'),
	`religion` enum('muslim','christian'),
	`practiceLevel` varchar(80),
	`ethnicity` varchar(100),
	`tribe` varchar(100),
	`residenceType` enum('gambia','diaspora') NOT NULL DEFAULT 'gambia',
	`country` varchar(100),
	`city` varchar(100),
	`maritalStatus` enum('never_married','divorced','widowed'),
	`educationLevel` varchar(100),
	`profession` varchar(160),
	`marriageTimeline` varchar(100),
	`relocationWillingness` enum('open','within_gambia','not_open','discuss'),
	`polygynyOpenness` enum('open','not_open','discuss','not_applicable'),
	`hasChildren` boolean NOT NULL DEFAULT false,
	`about` text,
	`familyBackground` text,
	`lifestyle` text,
	`profileVisibility` enum('public','members_only','hidden') NOT NULL DEFAULT 'members_only',
	`photoVisibility` enum('public','mutual_match','hidden') NOT NULL DEFAULT 'mutual_match',
	`searchVisible` boolean NOT NULL DEFAULT true,
	`familyVisibility` enum('private','matches','visible') NOT NULL DEFAULT 'private',
	`completedAt` timestamp,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_profiles_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`senderProfileId` int NOT NULL,
	`messageType` enum('text','voice','image') NOT NULL DEFAULT 'text',
	`body` text,
	`mediaStorageKey` varchar(512),
	`readAt` timestamp,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`notificationType` enum('interest','match','message','verification','safety','family') NOT NULL,
	`title` varchar(160) NOT NULL,
	`body` varchar(500) NOT NULL,
	`actionPath` varchar(255),
	`eventKey` varchar(191),
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `notifications_event_unique` UNIQUE(`userId`,`eventKey`)
);
--> statement-breakpoint
CREATE TABLE `profile_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`photoPurpose` enum('profile','verification') NOT NULL DEFAULT 'profile',
	`isPrimary` boolean NOT NULL DEFAULT false,
	`displayOrder` int NOT NULL DEFAULT 0,
	`reviewStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profile_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reporterProfileId` int NOT NULL,
	`reportedProfileId` int,
	`conversationId` int,
	`reason` enum('harassment','impersonation','scam','inappropriate_content','other') NOT NULL,
	`details` text,
	`status` enum('open','in_review','resolved','dismissed') NOT NULL DEFAULT 'open',
	`reviewedByUserId` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`plan` enum('free','premium','profile_review') NOT NULL DEFAULT 'free',
	`status` enum('inactive','active','past_due','cancelled','expired') NOT NULL DEFAULT 'inactive',
	`provider` varchar(80),
	`providerReference` varchar(255),
	`startsAt` timestamp,
	`endsAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verification_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`verificationType` enum('phone','email','identity_document','facial','profile_photo') NOT NULL,
	`status` enum('not_started','submitted','under_review','approved','rejected','expired') NOT NULL DEFAULT 'not_started',
	`documentStorageKey` varchar(512),
	`documentType` enum('national_id','passport'),
	`providerReference` varchar(255),
	`reviewNotes` text,
	`reviewedByUserId` int,
	`submittedAt` timestamp,
	`reviewedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verification_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `admin_roles` ADD CONSTRAINT `admin_roles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_roles` ADD CONSTRAINT `admin_roles_grantedByUserId_users_id_fk` FOREIGN KEY (`grantedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blocks` ADD CONSTRAINT `blocks_blockerProfileId_member_profiles_id_fk` FOREIGN KEY (`blockerProfileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blocks` ADD CONSTRAINT `blocks_blockedProfileId_member_profiles_id_fk` FOREIGN KEY (`blockedProfileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_matchId_matches_id_fk` FOREIGN KEY (`matchId`) REFERENCES `matches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `family_links` ADD CONSTRAINT `family_links_memberProfileId_member_profiles_id_fk` FOREIGN KEY (`memberProfileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `interest_requests` ADD CONSTRAINT `interest_requests_senderProfileId_member_profiles_id_fk` FOREIGN KEY (`senderProfileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `interest_requests` ADD CONSTRAINT `interest_requests_recipientProfileId_member_profiles_id_fk` FOREIGN KEY (`recipientProfileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT `matches_memberOneProfileId_member_profiles_id_fk` FOREIGN KEY (`memberOneProfileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT `matches_memberTwoProfileId_member_profiles_id_fk` FOREIGN KEY (`memberTwoProfileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_preferences` ADD CONSTRAINT `member_preferences_profileId_member_profiles_id_fk` FOREIGN KEY (`profileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD CONSTRAINT `member_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_senderProfileId_member_profiles_id_fk` FOREIGN KEY (`senderProfileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `profile_photos` ADD CONSTRAINT `profile_photos_profileId_member_profiles_id_fk` FOREIGN KEY (`profileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_reporterProfileId_member_profiles_id_fk` FOREIGN KEY (`reporterProfileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_reportedProfileId_member_profiles_id_fk` FOREIGN KEY (`reportedProfileId`) REFERENCES `member_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_profileId_member_profiles_id_fk` FOREIGN KEY (`profileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verification_records` ADD CONSTRAINT `verification_records_profileId_member_profiles_id_fk` FOREIGN KEY (`profileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verification_records` ADD CONSTRAINT `verification_records_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entityType`,`entityId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `family_links_profile_idx` ON `family_links` (`memberProfileId`,`status`);--> statement-breakpoint
CREATE INDEX `interest_requests_recipient_idx` ON `interest_requests` (`recipientProfileId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `matches_member_one_idx` ON `matches` (`memberOneProfileId`,`status`);--> statement-breakpoint
CREATE INDEX `matches_member_two_idx` ON `matches` (`memberTwoProfileId`,`status`);--> statement-breakpoint
CREATE INDEX `member_profiles_discovery_idx` ON `member_profiles` (`profileStatus`,`searchVisible`,`religion`,`residenceType`);--> statement-breakpoint
CREATE INDEX `member_profiles_location_idx` ON `member_profiles` (`country`,`city`);--> statement-breakpoint
CREATE INDEX `messages_conversation_idx` ON `messages` (`conversationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `notifications_user_unread_idx` ON `notifications` (`userId`,`readAt`,`createdAt`);--> statement-breakpoint
CREATE INDEX `profile_photos_profile_idx` ON `profile_photos` (`profileId`,`photoPurpose`,`reviewStatus`);--> statement-breakpoint
CREATE INDEX `reports_queue_idx` ON `reports` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `subscriptions_profile_idx` ON `subscriptions` (`profileId`,`status`);--> statement-breakpoint
CREATE INDEX `verification_records_profile_idx` ON `verification_records` (`profileId`,`status`);--> statement-breakpoint
CREATE INDEX `verification_records_queue_idx` ON `verification_records` (`status`,`submittedAt`);