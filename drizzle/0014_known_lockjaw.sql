CREATE TABLE `integrity_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`policyVersion` varchar(64) NOT NULL,
	`status` enum('draft','active','retired') NOT NULL DEFAULT 'draft',
	`ruleConfiguration` json NOT NULL,
	`retentionConfiguration` json NOT NULL,
	`createdByUserId` int,
	`activatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integrity_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `integrity_policies_version_unique` UNIQUE(`policyVersion`)
);
--> statement-breakpoint
CREATE TABLE `integrity_signals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectProfileId` int,
	`reportId` int,
	`source` enum('member_report','staff_observation','verification','account_security','messaging','family_circle','connection_readiness','payment','platform_rule','policy_violation') NOT NULL,
	`category` enum('account_behavior','verification_anomaly','messaging_behavior','report_pattern','block_pattern','family_circle_behavior','recommendation_abuse','connection_readiness_abuse','payment_abuse','account_security','session_anomaly','multiple_account_indicator','rapid_profile_change','invitation_behavior','repeated_policy_violation','financial_solicitation','other') NOT NULL,
	`severity` enum('informational','low','medium','high','critical') NOT NULL DEFAULT 'informational',
	`evidenceConfidence` enum('unverified','limited','corroborated','strong') NOT NULL DEFAULT 'unverified',
	`status` enum('new','triaged','monitoring','investigating','dismissed','actioned') NOT NULL DEFAULT 'new',
	`policyVersion` varchar(64),
	`idempotencyKey` varchar(191) NOT NULL,
	`safeMetadata` json,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	CONSTRAINT `integrity_signals_id` PRIMARY KEY(`id`),
	CONSTRAINT `integrity_signals_idempotency_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `safety_appeals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`enforcementActionId` int NOT NULL,
	`appellantUserId` int NOT NULL,
	`reason` text NOT NULL,
	`status` enum('submitted','in_review','information_requested','upheld','modified','overturned','withdrawn') NOT NULL DEFAULT 'submitted',
	`reviewerUserId` int,
	`decisionSummary` varchar(500),
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`decidedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `safety_appeals_id` PRIMARY KEY(`id`),
	CONSTRAINT `safety_appeals_action_appellant_unique` UNIQUE(`enforcementActionId`,`appellantUserId`)
);
--> statement-breakpoint
CREATE TABLE `safety_enforcement_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`subjectProfileId` int NOT NULL,
	`actionType` enum('warning','feature_restriction','messaging_restriction','connection_restriction','temporary_suspension','verification_hold','integrity_hold','permanent_account_removal') NOT NULL,
	`status` enum('proposed','active','expired','revoked','rejected','completed') NOT NULL DEFAULT 'proposed',
	`scope` json NOT NULL,
	`reasonCode` varchar(120) NOT NULL,
	`memberSafeMessage` varchar(500) NOT NULL,
	`policyVersion` varchar(64),
	`requiresSecondApproval` boolean NOT NULL DEFAULT false,
	`requestedByUserId` int NOT NULL,
	`approvedByUserId` int,
	`effectiveAt` timestamp,
	`expiresAt` timestamp,
	`revokedAt` timestamp,
	`revokedByUserId` int,
	`idempotencyKey` varchar(191) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `safety_enforcement_actions_id` PRIMARY KEY(`id`),
	CONSTRAINT `safety_enforcement_idempotency_unique` UNIQUE(`subjectProfileId`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `safety_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`integritySignalId` int,
	`evidenceType` enum('report_reference','message_reference','account_event','verification_event','payment_event','family_event','security_event','staff_note','integrity_signal') NOT NULL,
	`sourceRecordType` varchar(80) NOT NULL,
	`sourceRecordId` varchar(120) NOT NULL,
	`evidenceConfidence` enum('unverified','limited','corroborated','strong') NOT NULL DEFAULT 'unverified',
	`integrityState` enum('recorded','superseded','revoked') NOT NULL DEFAULT 'recorded',
	`capturedByUserId` int,
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `safety_evidence_id` PRIMARY KEY(`id`),
	CONSTRAINT `safety_evidence_reference_unique` UNIQUE(`reportId`,`evidenceType`,`sourceRecordType`,`sourceRecordId`)
);
--> statement-breakpoint
ALTER TABLE `reports` DROP FOREIGN KEY `reports_reporterProfileId_member_profiles_id_fk`;
--> statement-breakpoint
ALTER TABLE `reports` MODIFY COLUMN `reporterProfileId` int;--> statement-breakpoint
ALTER TABLE `reports` MODIFY COLUMN `reason` enum('fake_profile','impersonation','scam','harassment','threatening_behavior','inappropriate_content','financial_solicitation','misrepresentation','unwanted_contact','block_circumvention','verification_concern','multiple_account_concern','suspicious_behavior','safety_concern','other') NOT NULL;--> statement-breakpoint
ALTER TABLE `reports` MODIFY COLUMN `status` enum('open','triage','in_review','investigating','awaiting_information','action_required','decision_pending','resolved','dismissed','escalated','appealed','reopened','closed') NOT NULL DEFAULT 'open';--> statement-breakpoint
ALTER TABLE `reports` ADD `caseSource` enum('member_report','system_signal','staff_observation') DEFAULT 'member_report' NOT NULL;--> statement-breakpoint
ALTER TABLE `reports` ADD `policyVersion` varchar(64);--> statement-breakpoint
ALTER TABLE `reports` ADD `appealEligible` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `reports` ADD `memberSafeSummary` varchar(500);--> statement-breakpoint
ALTER TABLE `integrity_policies` ADD CONSTRAINT `integrity_policy_creator_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `integrity_signals` ADD CONSTRAINT `integrity_signal_subject_fk` FOREIGN KEY (`subjectProfileId`) REFERENCES `member_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `integrity_signals` ADD CONSTRAINT `integrity_signal_report_fk` FOREIGN KEY (`reportId`) REFERENCES `reports`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `integrity_signals` ADD CONSTRAINT `integrity_signal_creator_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `safety_appeals` ADD CONSTRAINT `safety_appeals_report_fk` FOREIGN KEY (`reportId`) REFERENCES `reports`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `safety_appeals` ADD CONSTRAINT `safety_appeals_enforcement_fk` FOREIGN KEY (`enforcementActionId`) REFERENCES `safety_enforcement_actions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `safety_appeals` ADD CONSTRAINT `safety_appeals_appellant_fk` FOREIGN KEY (`appellantUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `safety_appeals` ADD CONSTRAINT `safety_appeals_reviewer_fk` FOREIGN KEY (`reviewerUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `safety_enforcement_actions` ADD CONSTRAINT `safety_enforcement_report_fk` FOREIGN KEY (`reportId`) REFERENCES `reports`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `safety_enforcement_actions` ADD CONSTRAINT `safety_enforcement_profile_fk` FOREIGN KEY (`subjectProfileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `safety_enforcement_actions` ADD CONSTRAINT `safety_enforcement_requester_fk` FOREIGN KEY (`requestedByUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `safety_enforcement_actions` ADD CONSTRAINT `safety_enforcement_approver_fk` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `safety_enforcement_actions` ADD CONSTRAINT `safety_enforcement_revoker_fk` FOREIGN KEY (`revokedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `safety_evidence` ADD CONSTRAINT `safety_evidence_report_fk` FOREIGN KEY (`reportId`) REFERENCES `reports`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `safety_evidence` ADD CONSTRAINT `safety_evidence_signal_fk` FOREIGN KEY (`integritySignalId`) REFERENCES `integrity_signals`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `safety_evidence` ADD CONSTRAINT `safety_evidence_capturer_fk` FOREIGN KEY (`capturedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `integrity_policies_status_idx` ON `integrity_policies` (`status`,`activatedAt`);--> statement-breakpoint
CREATE INDEX `integrity_signals_subject_idx` ON `integrity_signals` (`subjectProfileId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `integrity_signals_case_idx` ON `integrity_signals` (`reportId`,`severity`,`createdAt`);--> statement-breakpoint
CREATE INDEX `safety_appeals_case_idx` ON `safety_appeals` (`reportId`,`status`,`submittedAt`);--> statement-breakpoint
CREATE INDEX `safety_appeals_reviewer_idx` ON `safety_appeals` (`reviewerUserId`,`status`);--> statement-breakpoint
CREATE INDEX `safety_enforcement_subject_idx` ON `safety_enforcement_actions` (`subjectProfileId`,`status`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `safety_enforcement_case_idx` ON `safety_enforcement_actions` (`reportId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `safety_evidence_case_idx` ON `safety_evidence` (`reportId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `safety_evidence_signal_idx` ON `safety_evidence` (`integritySignalId`,`createdAt`);--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_reporter_fk` FOREIGN KEY (`reporterProfileId`) REFERENCES `member_profiles`(`id`) ON DELETE set null ON UPDATE no action;
