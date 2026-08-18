ALTER TABLE `member_success_declarations` ADD `editorialStatus` enum('draft','private','pending_review','approved','published','withdrawn','rejected') DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE `member_success_declarations` ADD `publicStoryConsent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `member_success_declarations` ADD `publicConsentAt` timestamp;--> statement-breakpoint
ALTER TABLE `member_success_declarations` ADD `storySummary` varchar(1200);--> statement-breakpoint
ALTER TABLE `member_success_declarations` ADD `publicDisplayNameAuthorized` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `member_success_declarations` ADD `publicPhotoId` int;--> statement-breakpoint
ALTER TABLE `member_success_declarations` ADD `publicPhotoAuthorized` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `member_success_declarations` ADD `publicPhotoAuthorizedAt` timestamp;--> statement-breakpoint
ALTER TABLE `member_success_declarations` ADD `submittedAt` timestamp;--> statement-breakpoint
ALTER TABLE `member_success_declarations` ADD `reviewedByUserId` int;--> statement-breakpoint
ALTER TABLE `member_success_declarations` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `member_success_declarations` ADD `reviewNote` varchar(500);--> statement-breakpoint
ALTER TABLE `member_success_declarations` ADD `publishedByUserId` int;--> statement-breakpoint
ALTER TABLE `member_success_declarations` ADD `publishedAt` timestamp;--> statement-breakpoint
ALTER TABLE `profile_photos` ADD `reviewedByUserId` int;--> statement-breakpoint
ALTER TABLE `profile_photos` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `profile_photos` ADD `reviewNote` varchar(500);--> statement-breakpoint
ALTER TABLE `member_success_declarations` ADD CONSTRAINT `member_success_declarations_publicPhotoId_profile_photos_id_fk` FOREIGN KEY (`publicPhotoId`) REFERENCES `profile_photos`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_success_declarations` ADD CONSTRAINT `member_success_declarations_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_success_declarations` ADD CONSTRAINT `member_success_declarations_publishedByUserId_users_id_fk` FOREIGN KEY (`publishedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `profile_photos` ADD CONSTRAINT `profile_photos_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;