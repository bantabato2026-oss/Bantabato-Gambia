CREATE TABLE `operational_approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`approvalType` enum('safety_action','refund','staff_role_change','permission_override','policy_change','configuration_change','feature_flag') NOT NULL,
	`resourceType` varchar(80) NOT NULL,
	`resourceId` varchar(120) NOT NULL,
	`requestedByUserId` int NOT NULL,
	`requiredApproverRole` enum('platform_administrator','operations_manager','trust_safety_officer','verification_officer','customer_support_officer','finance_officer','content_policy_manager','read_only_auditor') NOT NULL,
	`status` enum('pending','approved','rejected','cancelled','expired') NOT NULL DEFAULT 'pending',
	`reason` varchar(1000) NOT NULL,
	`impactSummary` varchar(1000) NOT NULL,
	`approvedByUserId` int,
	`decidedAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operational_approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operational_feature_flags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`flagKey` varchar(120) NOT NULL,
	`environment` enum('development','staging','production') NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`status` enum('draft','approved','archived') NOT NULL DEFAULT 'draft',
	`configuration` json,
	`updatedByUserId` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operational_feature_flags_id` PRIMARY KEY(`id`),
	CONSTRAINT `off_key_environment_unique` UNIQUE(`flagKey`,`environment`)
);
--> statement-breakpoint
CREATE TABLE `operational_incident_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`incidentId` int NOT NULL,
	`actorUserId` int,
	`eventType` enum('detected','assigned','note_added','status_changed','escalated','resolved','post_incident_review') NOT NULL,
	`safeMetadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operational_incident_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operational_incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('notification_provider','payment_provider','authentication','database','safety_system','service_degradation','other') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`status` enum('detected','investigating','mitigating','monitoring','resolved','closed') NOT NULL DEFAULT 'detected',
	`title` varchar(220) NOT NULL,
	`summary` varchar(2000) NOT NULL,
	`assignedStaffProfileId` int,
	`detectedByUserId` int NOT NULL,
	`resolvedAt` timestamp,
	`closedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operational_incidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invitedEmail` varchar(320) NOT NULL,
	`invitationCodeHash` varchar(128) NOT NULL,
	`requestedRole` enum('platform_administrator','operations_manager','trust_safety_officer','verification_officer','customer_support_officer','finance_officer','content_policy_manager','read_only_auditor') NOT NULL,
	`status` enum('pending','accepted','expired','revoked') NOT NULL DEFAULT 'pending',
	`invitedByUserId` int NOT NULL,
	`acceptedByUserId` int,
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staff_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_invitation_hash_unique` UNIQUE(`invitationCodeHash`)
);
--> statement-breakpoint
CREATE TABLE `staff_permission_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffProfileId` int NOT NULL,
	`permissionId` int NOT NULL,
	`effect` enum('grant','revoke') NOT NULL,
	`status` enum('proposed','active','rejected','revoked','expired') NOT NULL DEFAULT 'proposed',
	`reason` varchar(500) NOT NULL,
	`requestedByUserId` int NOT NULL,
	`approvedByUserId` int,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`decidedAt` timestamp,
	CONSTRAINT `staff_permission_overrides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`permissionKey` varchar(120) NOT NULL,
	`module` varchar(64) NOT NULL,
	`description` varchar(300) NOT NULL,
	`highImpact` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staff_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_permissions_key_unique` UNIQUE(`permissionKey`)
);
--> statement-breakpoint
CREATE TABLE `staff_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`staffRole` enum('platform_administrator','operations_manager','trust_safety_officer','verification_officer','customer_support_officer','finance_officer','content_policy_manager','read_only_auditor') NOT NULL,
	`status` enum('invited','active','suspended','deactivated') NOT NULL DEFAULT 'invited',
	`mfaRequired` boolean NOT NULL DEFAULT false,
	`invitedByUserId` int,
	`activatedAt` timestamp,
	`suspendedAt` timestamp,
	`deactivatedAt` timestamp,
	`lastReauthenticatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_profiles_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `staff_role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffRole` enum('platform_administrator','operations_manager','trust_safety_officer','verification_officer','customer_support_officer','finance_officer','content_policy_manager','read_only_auditor') NOT NULL,
	`permissionId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staff_role_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `srp_role_permission_unique` UNIQUE(`staffRole`,`permissionId`)
);
--> statement-breakpoint
CREATE TABLE `staff_session_controls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffProfileId` int NOT NULL,
	`sessionReferenceHash` varchar(128) NOT NULL,
	`status` enum('active','revoked','expired') NOT NULL DEFAULT 'active',
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	`revokedByUserId` int,
	`reauthenticatedAt` timestamp,
	CONSTRAINT `staff_session_controls_id` PRIMARY KEY(`id`),
	CONSTRAINT `ssc_reference_unique` UNIQUE(`sessionReferenceHash`)
);
--> statement-breakpoint
CREATE TABLE `support_ticket_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`actorUserId` int,
	`eventType` enum('created','assigned','status_changed','note_added','escalated','resolved','closed') NOT NULL,
	`safeMetadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `support_ticket_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberProfileId` int NOT NULL,
	`category` enum('account_access','profile','verification','membership','payment','notifications','family_circle','technical_issue','safety_concern','other') NOT NULL,
	`subject` varchar(200) NOT NULL,
	`description` text NOT NULL,
	`status` enum('new','open','waiting_for_member','waiting_for_staff','escalated','resolved','closed') NOT NULL DEFAULT 'new',
	`priority` enum('low','normal','high','critical') NOT NULL DEFAULT 'normal',
	`assignedStaffProfileId` int,
	`escalatedReportId` int,
	`resolution` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`resolvedAt` timestamp,
	`closedAt` timestamp,
	CONSTRAINT `support_tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `operational_approvals` ADD CONSTRAINT `oa_requester_fk` FOREIGN KEY (`requestedByUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `operational_approvals` ADD CONSTRAINT `oa_approver_fk` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `operational_feature_flags` ADD CONSTRAINT `off_updater_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `operational_incident_events` ADD CONSTRAINT `oie_incident_fk` FOREIGN KEY (`incidentId`) REFERENCES `operational_incidents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `operational_incident_events` ADD CONSTRAINT `oie_actor_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `operational_incidents` ADD CONSTRAINT `oi_staff_fk` FOREIGN KEY (`assignedStaffProfileId`) REFERENCES `staff_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `operational_incidents` ADD CONSTRAINT `oi_detector_fk` FOREIGN KEY (`detectedByUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_invitations` ADD CONSTRAINT `si_inviter_fk` FOREIGN KEY (`invitedByUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_invitations` ADD CONSTRAINT `si_acceptor_fk` FOREIGN KEY (`acceptedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_permission_overrides` ADD CONSTRAINT `spo_staff_fk` FOREIGN KEY (`staffProfileId`) REFERENCES `staff_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_permission_overrides` ADD CONSTRAINT `spo_perm_fk` FOREIGN KEY (`permissionId`) REFERENCES `staff_permissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_permission_overrides` ADD CONSTRAINT `spo_req_fk` FOREIGN KEY (`requestedByUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_permission_overrides` ADD CONSTRAINT `spo_approver_fk` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_profiles` ADD CONSTRAINT `sp_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_profiles` ADD CONSTRAINT `sp_inviter_fk` FOREIGN KEY (`invitedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_role_permissions` ADD CONSTRAINT `srp_perm_fk` FOREIGN KEY (`permissionId`) REFERENCES `staff_permissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_session_controls` ADD CONSTRAINT `ssc_staff_fk` FOREIGN KEY (`staffProfileId`) REFERENCES `staff_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_session_controls` ADD CONSTRAINT `ssc_revoker_fk` FOREIGN KEY (`revokedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_ticket_events` ADD CONSTRAINT `ste_ticket_fk` FOREIGN KEY (`ticketId`) REFERENCES `support_tickets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_ticket_events` ADD CONSTRAINT `ste_actor_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_tickets` ADD CONSTRAINT `st_member_fk` FOREIGN KEY (`memberProfileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_tickets` ADD CONSTRAINT `st_staff_fk` FOREIGN KEY (`assignedStaffProfileId`) REFERENCES `staff_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_tickets` ADD CONSTRAINT `st_report_fk` FOREIGN KEY (`escalatedReportId`) REFERENCES `reports`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `oa_queue_idx` ON `operational_approvals` (`status`,`approvalType`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `oie_incident_created_idx` ON `operational_incident_events` (`incidentId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `incident_queue_idx` ON `operational_incidents` (`status`,`severity`,`createdAt`);--> statement-breakpoint
CREATE INDEX `staff_invitation_status_expiry_idx` ON `staff_invitations` (`status`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `spo_status_expiry_idx` ON `staff_permission_overrides` (`status`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `spo_staff_idx` ON `staff_permission_overrides` (`staffProfileId`,`status`);--> statement-breakpoint
CREATE INDEX `staff_permissions_module_idx` ON `staff_permissions` (`module`);--> statement-breakpoint
CREATE INDEX `staff_profiles_role_status_idx` ON `staff_profiles` (`staffRole`,`status`);--> statement-breakpoint
CREATE INDEX `ssc_staff_status_idx` ON `staff_session_controls` (`staffProfileId`,`status`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `ste_ticket_created_idx` ON `support_ticket_events` (`ticketId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `support_ticket_queue_idx` ON `support_tickets` (`status`,`priority`,`createdAt`);--> statement-breakpoint
CREATE INDEX `support_ticket_member_idx` ON `support_tickets` (`memberProfileId`,`createdAt`);--> statement-breakpoint
