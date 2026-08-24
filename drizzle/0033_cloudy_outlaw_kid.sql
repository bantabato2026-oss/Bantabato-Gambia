ALTER TABLE `support_tickets` MODIFY COLUMN `memberProfileId` int;--> statement-breakpoint
ALTER TABLE `support_tickets` MODIFY COLUMN `status` enum('new','open','waiting_for_member','waiting_for_staff','escalated','resolved','closed','withdrawn') NOT NULL DEFAULT 'new';--> statement-breakpoint
ALTER TABLE `support_tickets` ADD `requesterUserId` int;--> statement-breakpoint
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_requesterUserId_users_id_fk` FOREIGN KEY (`requesterUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `support_ticket_requester_idx` ON `support_tickets` (`requesterUserId`,`createdAt`);