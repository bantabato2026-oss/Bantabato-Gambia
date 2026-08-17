CREATE TABLE `beta_enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`invitationId` int,
	`status` enum('enrolled','suspended','removed') NOT NULL DEFAULT 'enrolled',
	`enrolledAt` timestamp NOT NULL DEFAULT (now()),
	`suspendedAt` timestamp,
	`removedAt` timestamp,
	`changedByUserId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `beta_enrollments_id` PRIMARY KEY(`id`),
	CONSTRAINT `beta_enrollment_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `beta_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invitationId` int,
	`enrollmentId` int,
	`actorUserId` int,
	`eventType` enum('mode_changed','invitation_created','invitation_accepted','invitation_revoked','enrollment_completed','enrollment_suspended','enrollment_removed','emergency_shutdown') NOT NULL,
	`safeMetadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `beta_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `beta_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invitedEmail` varchar(320) NOT NULL,
	`invitationCodeHash` varchar(128) NOT NULL,
	`status` enum('pending','accepted','expired','revoked') NOT NULL DEFAULT 'pending',
	`invitedByUserId` int NOT NULL,
	`acceptedByUserId` int,
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `beta_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `beta_invitation_hash_unique` UNIQUE(`invitationCodeHash`)
);
--> statement-breakpoint
CREATE TABLE `beta_launch_controls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`environment` enum('development','staging','production') NOT NULL,
	`mode` enum('disabled','invite_only','paused','shutdown') NOT NULL DEFAULT 'disabled',
	`updatedByUserId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `beta_launch_controls_id` PRIMARY KEY(`id`),
	CONSTRAINT `beta_control_environment_unique` UNIQUE(`environment`)
);
--> statement-breakpoint
ALTER TABLE `beta_enrollments` ADD CONSTRAINT `beta_enrollments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beta_enrollments` ADD CONSTRAINT `beta_enrollments_invitationId_beta_invitations_id_fk` FOREIGN KEY (`invitationId`) REFERENCES `beta_invitations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beta_enrollments` ADD CONSTRAINT `beta_enrollments_changedByUserId_users_id_fk` FOREIGN KEY (`changedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beta_events` ADD CONSTRAINT `beta_events_invitationId_beta_invitations_id_fk` FOREIGN KEY (`invitationId`) REFERENCES `beta_invitations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beta_events` ADD CONSTRAINT `beta_events_enrollmentId_beta_enrollments_id_fk` FOREIGN KEY (`enrollmentId`) REFERENCES `beta_enrollments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beta_events` ADD CONSTRAINT `beta_events_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beta_invitations` ADD CONSTRAINT `beta_invitations_invitedByUserId_users_id_fk` FOREIGN KEY (`invitedByUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beta_invitations` ADD CONSTRAINT `beta_invitations_acceptedByUserId_users_id_fk` FOREIGN KEY (`acceptedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beta_launch_controls` ADD CONSTRAINT `beta_launch_controls_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `beta_enrollment_status_idx` ON `beta_enrollments` (`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `beta_events_invitation_idx` ON `beta_events` (`invitationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `beta_events_enrollment_idx` ON `beta_events` (`enrollmentId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `beta_invitation_status_expiry_idx` ON `beta_invitations` (`status`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `beta_invitation_email_idx` ON `beta_invitations` (`invitedEmail`,`status`);