CREATE TABLE `member_success_declarations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`outcome` enum('engaged','married') NOT NULL,
	`sharingConsent` boolean NOT NULL DEFAULT false,
	`status` enum('private','consent_recorded','withdrawn') NOT NULL DEFAULT 'private',
	`declaredAt` timestamp NOT NULL DEFAULT (now()),
	`consentRecordedAt` timestamp,
	`withdrawnAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_success_declarations_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_success_declaration_profile_unique` UNIQUE(`profileId`)
);
--> statement-breakpoint
ALTER TABLE `member_success_declarations` ADD CONSTRAINT `member_success_declarations_profileId_member_profiles_id_fk` FOREIGN KEY (`profileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `member_success_declaration_status_idx` ON `member_success_declarations` (`status`,`updatedAt`);