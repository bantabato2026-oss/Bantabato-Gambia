CREATE TABLE `member_security_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionReferenceHash` varchar(128) NOT NULL,
	`status` enum('active','revoked','expired') NOT NULL DEFAULT 'active',
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	`revokedByUserId` int,
	`reauthenticatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_security_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `mss_reference_unique` UNIQUE(`sessionReferenceHash`)
);
--> statement-breakpoint
ALTER TABLE `member_security_sessions` ADD CONSTRAINT `member_security_sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_security_sessions` ADD CONSTRAINT `member_security_sessions_revokedByUserId_users_id_fk` FOREIGN KEY (`revokedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `mss_user_status_idx` ON `member_security_sessions` (`userId`,`status`,`lastSeenAt`);