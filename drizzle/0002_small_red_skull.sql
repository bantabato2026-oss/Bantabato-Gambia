CREATE TABLE `case_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseType` enum('verification','report') NOT NULL,
	`caseId` int NOT NULL,
	`authorUserId` int NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `case_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP INDEX `reports_queue_idx` ON `reports`;--> statement-breakpoint
DROP INDEX `verification_records_queue_idx` ON `verification_records`;--> statement-breakpoint
ALTER TABLE `reports` MODIFY COLUMN `reason` enum('fake_profile','impersonation','scam','harassment','inappropriate_content','financial_solicitation','suspicious_behavior','safety_concern','other') NOT NULL;--> statement-breakpoint
ALTER TABLE `reports` MODIFY COLUMN `status` enum('open','in_review','action_required','resolved','dismissed','escalated') NOT NULL DEFAULT 'open';--> statement-breakpoint
ALTER TABLE `verification_records` MODIFY COLUMN `status` enum('not_started','submitted','under_review','approved','rejected','requires_resubmission','escalated','expired') NOT NULL DEFAULT 'not_started';--> statement-breakpoint
ALTER TABLE `reports` ADD `priority` enum('low','normal','high','critical') DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `reports` ADD `assignedModeratorUserId` int;--> statement-breakpoint
ALTER TABLE `reports` ADD `memberAction` enum('none','warn','restrict','temporary_suspend') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `reports` ADD `memberMessage` varchar(500);--> statement-breakpoint
ALTER TABLE `reports` ADD `resolution` varchar(500);--> statement-breakpoint
ALTER TABLE `verification_records` ADD `reviewReason` enum('document_unclear','document_expired','document_unsupported','information_mismatch','image_quality_insufficient','verification_image_insufficient','suspected_duplicate','suspected_fraud','requires_additional_review','other');--> statement-breakpoint
ALTER TABLE `verification_records` ADD `memberMessage` varchar(500);--> statement-breakpoint
ALTER TABLE `verification_records` ADD `priority` enum('standard','attention','high') DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE `verification_records` ADD `assignedReviewerUserId` int;--> statement-breakpoint
ALTER TABLE `verification_records` ADD `escalatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `verification_records` ADD `closedAt` timestamp;--> statement-breakpoint
ALTER TABLE `case_notes` ADD CONSTRAINT `case_notes_authorUserId_users_id_fk` FOREIGN KEY (`authorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `case_notes_case_idx` ON `case_notes` (`caseType`,`caseId`,`createdAt`);--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_assignedModeratorUserId_users_id_fk` FOREIGN KEY (`assignedModeratorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verification_records` ADD CONSTRAINT `verification_records_assignedReviewerUserId_users_id_fk` FOREIGN KEY (`assignedReviewerUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `reports_assignee_idx` ON `reports` (`assignedModeratorUserId`,`status`);--> statement-breakpoint
CREATE INDEX `verification_records_assignee_idx` ON `verification_records` (`assignedReviewerUserId`,`status`);--> statement-breakpoint
CREATE INDEX `reports_queue_idx` ON `reports` (`status`,`priority`,`createdAt`);--> statement-breakpoint
CREATE INDEX `verification_records_queue_idx` ON `verification_records` (`status`,`priority`,`submittedAt`);