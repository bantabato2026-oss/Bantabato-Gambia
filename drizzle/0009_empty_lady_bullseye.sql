CREATE TABLE `family_acknowledgments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`familyShareId` int NOT NULL,
	`status` enum('requested','acknowledged','declined','withdrawn','expired') NOT NULL DEFAULT 'requested',
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`respondedAt` timestamp,
	`withdrawnAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `family_acknowledgments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `family_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`familyLinkId` int NOT NULL,
	`actorUserId` int,
	`eventType` enum('invitation_sent','invitation_accepted','invitation_declined','permission_granted','permission_revoked','match_shared','share_withdrawn','acknowledgment_requested','acknowledgment_submitted','feedback_submitted','participant_removed','access_restricted','report_submitted') NOT NULL,
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `family_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `family_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`familyShareId` int NOT NULL,
	`familyLinkId` int NOT NULL,
	`response` enum('acknowledged','interested_to_learn_more','has_concerns','decline_to_comment') NOT NULL,
	`note` varchar(1200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `family_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `family_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`familyLinkId` int NOT NULL,
	`permission` enum('profile_basics','profile_photo','marriage_intentions','compatibility_summary','family_context','potential_match','acknowledgment_status') NOT NULL,
	`isGranted` boolean NOT NULL DEFAULT false,
	`grantedAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `family_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `family_permissions_link_permission_unique` UNIQUE(`familyLinkId`,`permission`)
);
--> statement-breakpoint
CREATE TABLE `family_shares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`familyLinkId` int NOT NULL,
	`sharedProfileId` int NOT NULL,
	`status` enum('active','withdrawn','expired') NOT NULL DEFAULT 'active',
	`expiresAt` timestamp,
	`withdrawnAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `family_shares_id` PRIMARY KEY(`id`),
	CONSTRAINT `family_shares_active_pair_unique` UNIQUE(`familyLinkId`,`sharedProfileId`,`status`)
);
--> statement-breakpoint
ALTER TABLE `family_links` MODIFY COLUMN `status` enum('draft','invited','accepted','declined','pending_verification','verified','unverified','suspended','removed','revoked') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `family_links` ADD `preferredContactMethod` enum('email','phone') DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE `family_links` ADD `familyParticipantUserId` int;--> statement-breakpoint
ALTER TABLE `family_links` ADD `waliVerificationStatus` enum('not_required','pending','verified','unverified') DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE `family_links` ADD `invitationCodeHash` varchar(128);--> statement-breakpoint
ALTER TABLE `family_links` ADD `invitationExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `family_links` ADD `acceptedAt` timestamp;--> statement-breakpoint
ALTER TABLE `family_links` ADD `declinedAt` timestamp;--> statement-breakpoint
ALTER TABLE `family_links` ADD `restrictedAt` timestamp;--> statement-breakpoint
ALTER TABLE `family_links` ADD `removedAt` timestamp;--> statement-breakpoint
ALTER TABLE `family_links` ADD CONSTRAINT `family_links_invite_code_unique` UNIQUE(`invitationCodeHash`);--> statement-breakpoint
ALTER TABLE `family_acknowledgments` ADD CONSTRAINT `family_acknowledgments_familyShareId_family_shares_id_fk` FOREIGN KEY (`familyShareId`) REFERENCES `family_shares`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `family_events` ADD CONSTRAINT `family_events_familyLinkId_family_links_id_fk` FOREIGN KEY (`familyLinkId`) REFERENCES `family_links`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `family_events` ADD CONSTRAINT `family_events_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `family_feedback` ADD CONSTRAINT `family_feedback_familyShareId_family_shares_id_fk` FOREIGN KEY (`familyShareId`) REFERENCES `family_shares`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `family_feedback` ADD CONSTRAINT `family_feedback_familyLinkId_family_links_id_fk` FOREIGN KEY (`familyLinkId`) REFERENCES `family_links`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `family_permissions` ADD CONSTRAINT `family_permissions_familyLinkId_family_links_id_fk` FOREIGN KEY (`familyLinkId`) REFERENCES `family_links`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `family_shares` ADD CONSTRAINT `family_shares_familyLinkId_family_links_id_fk` FOREIGN KEY (`familyLinkId`) REFERENCES `family_links`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `family_shares` ADD CONSTRAINT `family_shares_sharedProfileId_member_profiles_id_fk` FOREIGN KEY (`sharedProfileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `family_acknowledgments_share_idx` ON `family_acknowledgments` (`familyShareId`,`status`);--> statement-breakpoint
CREATE INDEX `family_events_link_idx` ON `family_events` (`familyLinkId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `family_feedback_share_idx` ON `family_feedback` (`familyShareId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `family_permissions_link_idx` ON `family_permissions` (`familyLinkId`,`isGranted`);--> statement-breakpoint
CREATE INDEX `family_shares_link_idx` ON `family_shares` (`familyLinkId`,`status`);--> statement-breakpoint
ALTER TABLE `family_links` ADD CONSTRAINT `family_links_familyParticipantUserId_users_id_fk` FOREIGN KEY (`familyParticipantUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `family_links_participant_idx` ON `family_links` (`familyParticipantUserId`,`status`);