CREATE TABLE `member_recommendation_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`recommendationsEnabled` boolean NOT NULL DEFAULT true,
	`showVerifiedCategory` boolean NOT NULL DEFAULT true,
	`showNearbyCategory` boolean NOT NULL DEFAULT true,
	`showRecentCategory` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_recommendation_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_recommendation_settings_profile_unique` UNIQUE(`profileId`)
);
--> statement-breakpoint
CREATE TABLE `recommendation_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recommendationId` int NOT NULL,
	`profileId` int NOT NULL,
	`eventType` enum('generated','presented','viewed','withdrawn','feedback_recorded','interest_started') NOT NULL,
	`policyVersion` varchar(64) NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recommendation_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recommendation_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recommendationId` int NOT NULL,
	`profileId` int NOT NULL,
	`response` enum('not_interested','not_relevant','already_considered','hide_profile') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recommendation_feedback_id` PRIMARY KEY(`id`),
	CONSTRAINT `recommendation_feedback_unique` UNIQUE(`recommendationId`,`profileId`)
);
--> statement-breakpoint
CREATE TABLE `recommendation_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`policyVersion` varchar(64) NOT NULL,
	`status` enum('draft','active','retired') NOT NULL DEFAULT 'draft',
	`categories` json NOT NULL,
	`dimensionWeights` json NOT NULL,
	`eligibilityRules` json NOT NULL,
	`createdByUserId` int,
	`activatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recommendation_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `recommendation_policy_version_unique` UNIQUE(`policyVersion`)
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`candidateProfileId` int NOT NULL,
	`recommendationPolicyId` int NOT NULL,
	`categoryKey` varchar(64) NOT NULL,
	`status` enum('active','dismissed','hidden','withdrawn','expired') NOT NULL DEFAULT 'active',
	`explanationKeys` json NOT NULL,
	`considerationKeys` json NOT NULL,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`lastEvaluatedAt` timestamp NOT NULL DEFAULT (now()),
	`withdrawnAt` timestamp,
	`expiresAt` timestamp,
	CONSTRAINT `recommendations_id` PRIMARY KEY(`id`),
	CONSTRAINT `recommendations_profile_candidate_policy_unique` UNIQUE(`profileId`,`candidateProfileId`,`recommendationPolicyId`)
);
--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `notificationType` enum('interest','match','message','verification','safety','family','connection','recommendation') NOT NULL;--> statement-breakpoint
ALTER TABLE `member_recommendation_settings` ADD CONSTRAINT `member_recommendation_settings_profileId_member_profiles_id_fk` FOREIGN KEY (`profileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendation_events` ADD CONSTRAINT `recommendation_events_recommendationId_recommendations_id_fk` FOREIGN KEY (`recommendationId`) REFERENCES `recommendations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendation_events` ADD CONSTRAINT `recommendation_events_profileId_member_profiles_id_fk` FOREIGN KEY (`profileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendation_feedback` ADD CONSTRAINT `recommendation_feedback_recommendationId_recommendations_id_fk` FOREIGN KEY (`recommendationId`) REFERENCES `recommendations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendation_feedback` ADD CONSTRAINT `recommendation_feedback_profileId_member_profiles_id_fk` FOREIGN KEY (`profileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendation_policies` ADD CONSTRAINT `recommendation_policies_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendations` ADD CONSTRAINT `recommendations_profileId_member_profiles_id_fk` FOREIGN KEY (`profileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendations` ADD CONSTRAINT `recommendations_candidateProfileId_member_profiles_id_fk` FOREIGN KEY (`candidateProfileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendations` ADD CONSTRAINT `recommendations_policy_fk` FOREIGN KEY (`recommendationPolicyId`) REFERENCES `recommendation_policies`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `recommendation_events_recommendation_idx` ON `recommendation_events` (`recommendationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `recommendation_events_profile_idx` ON `recommendation_events` (`profileId`,`eventType`,`createdAt`);--> statement-breakpoint
CREATE INDEX `recommendation_feedback_profile_idx` ON `recommendation_feedback` (`profileId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `recommendation_policy_status_idx` ON `recommendation_policies` (`status`,`activatedAt`);--> statement-breakpoint
CREATE INDEX `recommendations_member_feed_idx` ON `recommendations` (`profileId`,`status`,`categoryKey`,`generatedAt`);--> statement-breakpoint
CREATE INDEX `recommendations_candidate_status_idx` ON `recommendations` (`candidateProfileId`,`status`);
