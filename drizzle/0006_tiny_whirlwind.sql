CREATE TABLE `communication_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`connectionStateId` int NOT NULL,
	`capability` enum('voice','video') NOT NULL,
	`status` enum('unavailable','available','paused','revoked') NOT NULL DEFAULT 'unavailable',
	`providerReference` varchar(255),
	`availableAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `communication_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `communication_permissions_unique` UNIQUE(`connectionStateId`,`capability`)
);
--> statement-breakpoint
CREATE TABLE `communication_revocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`connectionStateId` int NOT NULL,
	`capability` enum('voice','video','all') NOT NULL DEFAULT 'all',
	`reason` enum('member_withdrew_consent','block','open_report','safety_restriction','account_suspended','hard_incompatibility','manual_review','other') NOT NULL,
	`actorProfileId` int,
	`actorUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `communication_revocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `connection_consents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`connectionStateId` int NOT NULL,
	`profileId` int NOT NULL,
	`capability` enum('voice','video') NOT NULL,
	`status` enum('pending','granted','withdrawn','declined') NOT NULL DEFAULT 'pending',
	`grantedAt` timestamp,
	`withdrawnAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `connection_consents_id` PRIMARY KEY(`id`),
	CONSTRAINT `connection_consents_unique` UNIQUE(`connectionStateId`,`profileId`,`capability`)
);
--> statement-breakpoint
CREATE TABLE `connection_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`connectionStateId` int NOT NULL,
	`actorProfileId` int,
	`actorUserId` int,
	`eventType` enum('evaluated','ready_for_review','voice_consent_granted','voice_consent_withdrawn','video_consent_granted','video_consent_withdrawn','voice_approved','video_approved','review_escalated','restricted','revoked','paused') NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `connection_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `connection_readiness_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`policyName` varchar(120) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`stageConfig` json NOT NULL,
	`thresholdConfig` json NOT NULL,
	`requireIdentityVerification` boolean NOT NULL DEFAULT true,
	`requireVoiceNotesForReview` boolean NOT NULL DEFAULT true,
	`requireHumanReviewForVoice` boolean NOT NULL DEFAULT false,
	`requireHumanReviewForVideo` boolean NOT NULL DEFAULT true,
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `connection_readiness_policies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `connection_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`connectionStateId` int NOT NULL,
	`status` enum('pending','approved_voice','approved_video','declined','restricted','revoked','escalated') NOT NULL DEFAULT 'pending',
	`reason` enum('safety_signal','fraud_concern','open_report','ambiguous_criteria','policy_requirement','other'),
	`assignedReviewerUserId` int,
	`reviewedByUserId` int,
	`memberMessage` varchar(500),
	`internalNote` text,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `connection_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `connection_states` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`policyId` int,
	`stage` enum('mutual_interest','text_conversation','voice_note_conversation','ready_for_review','voice_call_eligible','video_call_eligible') NOT NULL DEFAULT 'mutual_interest',
	`status` enum('not_ready','building_connection','ready_for_review','approved_voice','approved_video','declined','paused','restricted','revoked') NOT NULL DEFAULT 'not_ready',
	`readinessSummary` json,
	`policySnapshot` json,
	`reviewRequired` boolean NOT NULL DEFAULT false,
	`voiceEligible` boolean NOT NULL DEFAULT false,
	`videoEligible` boolean NOT NULL DEFAULT false,
	`lastEvaluatedAt` timestamp,
	`approvedAt` timestamp,
	`pausedAt` timestamp,
	`restrictedAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `connection_states_id` PRIMARY KEY(`id`),
	CONSTRAINT `connection_states_conversation_unique` UNIQUE(`conversationId`)
);
--> statement-breakpoint
ALTER TABLE `communication_permissions` ADD CONSTRAINT `comm_perm_state_fk` FOREIGN KEY (`connectionStateId`) REFERENCES `connection_states`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `communication_revocations` ADD CONSTRAINT `comm_revoke_state_fk` FOREIGN KEY (`connectionStateId`) REFERENCES `connection_states`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `communication_revocations` ADD CONSTRAINT `comm_revoke_profile_fk` FOREIGN KEY (`actorProfileId`) REFERENCES `member_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `communication_revocations` ADD CONSTRAINT `comm_revoke_user_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `connection_consents` ADD CONSTRAINT `conn_consent_state_fk` FOREIGN KEY (`connectionStateId`) REFERENCES `connection_states`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `connection_consents` ADD CONSTRAINT `conn_consent_profile_fk` FOREIGN KEY (`profileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `connection_events` ADD CONSTRAINT `conn_event_state_fk` FOREIGN KEY (`connectionStateId`) REFERENCES `connection_states`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `connection_events` ADD CONSTRAINT `conn_event_profile_fk` FOREIGN KEY (`actorProfileId`) REFERENCES `member_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `connection_events` ADD CONSTRAINT `conn_event_user_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `connection_readiness_policies` ADD CONSTRAINT `conn_policy_user_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `connection_reviews` ADD CONSTRAINT `conn_review_state_fk` FOREIGN KEY (`connectionStateId`) REFERENCES `connection_states`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `connection_reviews` ADD CONSTRAINT `conn_review_assignee_fk` FOREIGN KEY (`assignedReviewerUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `connection_reviews` ADD CONSTRAINT `conn_review_reviewer_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `connection_states` ADD CONSTRAINT `conn_state_conversation_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `connection_states` ADD CONSTRAINT `conn_state_policy_fk` FOREIGN KEY (`policyId`) REFERENCES `connection_readiness_policies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `communication_permissions_status_idx` ON `communication_permissions` (`status`,`capability`);--> statement-breakpoint
CREATE INDEX `communication_revocations_state_idx` ON `communication_revocations` (`connectionStateId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `connection_consents_profile_idx` ON `connection_consents` (`profileId`,`capability`,`status`);--> statement-breakpoint
CREATE INDEX `connection_events_state_idx` ON `connection_events` (`connectionStateId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `connection_readiness_policy_active_idx` ON `connection_readiness_policies` (`isActive`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `connection_reviews_queue_idx` ON `connection_reviews` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `connection_reviews_assignee_idx` ON `connection_reviews` (`assignedReviewerUserId`,`status`);--> statement-breakpoint
CREATE INDEX `connection_states_status_idx` ON `connection_states` (`status`,`reviewRequired`,`updatedAt`);
