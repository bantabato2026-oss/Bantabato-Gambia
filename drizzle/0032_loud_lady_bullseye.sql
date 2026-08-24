ALTER TABLE `support_tickets` ADD `idempotencyKey` varchar(100);--> statement-breakpoint
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_idempotencyKey_unique` UNIQUE(`idempotencyKey`);