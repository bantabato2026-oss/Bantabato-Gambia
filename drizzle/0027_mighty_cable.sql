ALTER TABLE `payment_reconciliations` MODIFY COLUMN `paymentTransactionId` int;--> statement-breakpoint
ALTER TABLE `payment_reconciliations` ADD `subscriptionId` int;--> statement-breakpoint
ALTER TABLE `payment_reconciliations` ADD `issueCode` varchar(100);--> statement-breakpoint
ALTER TABLE `payment_reconciliations` ADD CONSTRAINT `payment_reconciliations_subscription_issue_unique` UNIQUE(`subscriptionId`,`issueCode`);--> statement-breakpoint
ALTER TABLE `payment_reconciliations` ADD CONSTRAINT `payment_reconciliations_subscriptionId_subscriptions_id_fk` FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON DELETE cascade ON UPDATE no action;