CREATE TABLE `member_billing_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`preferredCurrency` varchar(3) NOT NULL DEFAULT 'GMD',
	`receiptEmail` varchar(320),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_billing_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_billing_settings_profile_unique` UNIQUE(`profileId`)
);
--> statement-breakpoint
CREATE TABLE `membership_plan_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`membershipPlanId` int NOT NULL,
	`versionCode` varchar(80) NOT NULL,
	`status` enum('draft','active','retired') NOT NULL DEFAULT 'draft',
	`featureKeys` json NOT NULL,
	`renewalTerms` text,
	`gracePeriodDays` int NOT NULL DEFAULT 0,
	`graceEntitlementsActive` boolean NOT NULL DEFAULT false,
	`cancelAtPeriodEndAllowed` boolean NOT NULL DEFAULT true,
	`createdByUserId` int,
	`activatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `membership_plan_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `membership_plan_versions_code_unique` UNIQUE(`versionCode`)
);
--> statement-breakpoint
CREATE TABLE `membership_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`displayName` varchar(120) NOT NULL,
	`membershipLevel` enum('free','premium') NOT NULL,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `membership_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `membership_plans_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `membership_prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`membershipPlanVersionId` int NOT NULL,
	`currency` varchar(3) NOT NULL,
	`amountMinor` int NOT NULL,
	`taxMinor` int NOT NULL DEFAULT 0,
	`billingInterval` enum('monthly','quarterly','annual','one_time') NOT NULL,
	`provider` varchar(80),
	`providerPriceReference` varchar(255),
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `membership_prices_id` PRIMARY KEY(`id`),
	CONSTRAINT `membership_prices_version_currency_interval_unique` UNIQUE(`membershipPlanVersionId`,`currency`,`billingInterval`,`provider`)
);
--> statement-breakpoint
CREATE TABLE `payment_provider_configurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(80) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`supportedCurrencies` json NOT NULL,
	`supportedMethods` json NOT NULL,
	`configurationNote` varchar(500),
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_provider_configurations_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_provider_configurations_provider_unique` UNIQUE(`provider`)
);
--> statement-breakpoint
CREATE TABLE `payment_reconciliations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paymentTransactionId` int NOT NULL,
	`status` enum('open','reconciled','needs_review') NOT NULL DEFAULT 'open',
	`providerObservedStatus` varchar(120),
	`note` varchar(500),
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_reconciliations_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_reconciliations_transaction_unique` UNIQUE(`paymentTransactionId`)
);
--> statement-breakpoint
CREATE TABLE `payment_refunds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paymentTransactionId` int NOT NULL,
	`providerRefundReference` varchar(255),
	`status` enum('requested','processing','succeeded','failed','cancelled') NOT NULL DEFAULT 'requested',
	`amountMinor` int NOT NULL,
	`reason` varchar(500),
	`requestedByUserId` int,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_refunds_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_refunds_provider_reference_unique` UNIQUE(`providerRefundReference`)
);
--> statement-breakpoint
CREATE TABLE `payment_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int,
	`subscriptionId` int,
	`membershipPriceId` int,
	`provider` varchar(80) NOT NULL,
	`internalReference` varchar(96) NOT NULL,
	`providerTransactionId` varchar(255),
	`idempotencyKey` varchar(96) NOT NULL,
	`transactionType` enum('initial','renewal','recovery','manual_adjustment') NOT NULL DEFAULT 'initial',
	`status` enum('created','pending','processing','successful','failed','cancelled','expired','refunded','partially_refunded','disputed') NOT NULL DEFAULT 'created',
	`amountMinor` int NOT NULL,
	`currency` varchar(3) NOT NULL,
	`taxMinor` int NOT NULL DEFAULT 0,
	`feeMinor` int NOT NULL DEFAULT 0,
	`discountMinor` int NOT NULL DEFAULT 0,
	`failureCode` varchar(120),
	`failureMessage` varchar(500),
	`completedAt` timestamp,
	`providerVerifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_transactions_internal_reference_unique` UNIQUE(`internalReference`),
	CONSTRAINT `payment_transactions_idempotency_unique` UNIQUE(`idempotencyKey`),
	CONSTRAINT `payment_transactions_provider_reference_unique` UNIQUE(`provider`,`providerTransactionId`)
);
--> statement-breakpoint
CREATE TABLE `payment_webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(80) NOT NULL,
	`providerEventId` varchar(255) NOT NULL,
	`eventType` varchar(120) NOT NULL,
	`payloadHash` varchar(128) NOT NULL,
	`signatureValid` boolean NOT NULL DEFAULT false,
	`status` enum('received','verified','processed','rejected','failed') NOT NULL DEFAULT 'received',
	`paymentTransactionId` int,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `payment_webhook_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_webhook_events_provider_event_unique` UNIQUE(`provider`,`providerEventId`)
);
--> statement-breakpoint
CREATE TABLE `subscription_entitlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscriptionId` int NOT NULL,
	`entitlementKey` enum('advanced_discovery','expanded_discovery_controls','profile_visibility_controls','enhanced_recommendation_controls','profile_management_convenience') NOT NULL,
	`status` enum('active','revoked','expired') NOT NULL DEFAULT 'active',
	`startsAt` timestamp NOT NULL DEFAULT (now()),
	`endsAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_entitlements_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscription_entitlements_unique` UNIQUE(`subscriptionId`,`entitlementKey`)
);
--> statement-breakpoint
ALTER TABLE `subscriptions` DROP FOREIGN KEY `subscriptions_profileId_member_profiles_id_fk`;
--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `notificationType` enum('interest','match','message','verification','safety','family','connection','recommendation','billing') NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` MODIFY COLUMN `profileId` int;--> statement-breakpoint
ALTER TABLE `subscriptions` MODIFY COLUMN `status` enum('trial','active','past_due','grace_period','cancelled','expired','suspended','refunded','inactive') NOT NULL DEFAULT 'inactive';--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `membershipPlanVersionId` int;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `providerCustomerReference` varchar(255);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `autoRenew` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `cancelAtPeriodEnd` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `currentPeriodStartsAt` timestamp;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `currentPeriodEndsAt` timestamp;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `gracePeriodEndsAt` timestamp;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `cancelledAt` timestamp;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `endedAt` timestamp;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `suspendedAt` timestamp;--> statement-breakpoint
ALTER TABLE `member_billing_settings` ADD CONSTRAINT `mbs_profile_fk` FOREIGN KEY (`profileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `membership_plan_versions` ADD CONSTRAINT `mpv_plan_fk` FOREIGN KEY (`membershipPlanId`) REFERENCES `membership_plans`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `membership_plan_versions` ADD CONSTRAINT `mpv_creator_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `membership_prices` ADD CONSTRAINT `mpr_version_fk` FOREIGN KEY (`membershipPlanVersionId`) REFERENCES `membership_plan_versions`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_provider_configurations` ADD CONSTRAINT `ppc_updater_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_reconciliations` ADD CONSTRAINT `prec_tx_fk` FOREIGN KEY (`paymentTransactionId`) REFERENCES `payment_transactions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_reconciliations` ADD CONSTRAINT `prec_reviewer_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_refunds` ADD CONSTRAINT `pref_tx_fk` FOREIGN KEY (`paymentTransactionId`) REFERENCES `payment_transactions`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_refunds` ADD CONSTRAINT `pref_requester_fk` FOREIGN KEY (`requestedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_transactions` ADD CONSTRAINT `ptx_profile_fk` FOREIGN KEY (`profileId`) REFERENCES `member_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_transactions` ADD CONSTRAINT `ptx_subscription_fk` FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_transactions` ADD CONSTRAINT `ptx_price_fk` FOREIGN KEY (`membershipPriceId`) REFERENCES `membership_prices`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_webhook_events` ADD CONSTRAINT `pwe_tx_fk` FOREIGN KEY (`paymentTransactionId`) REFERENCES `payment_transactions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_entitlements` ADD CONSTRAINT `se_subscription_fk` FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `membership_plan_versions_plan_status_idx` ON `membership_plan_versions` (`membershipPlanId`,`status`);--> statement-breakpoint
CREATE INDEX `membership_plans_level_status_idx` ON `membership_plans` (`membershipLevel`,`status`);--> statement-breakpoint
CREATE INDEX `membership_prices_availability_idx` ON `membership_prices` (`currency`,`status`,`billingInterval`);--> statement-breakpoint
CREATE INDEX `payment_reconciliations_status_idx` ON `payment_reconciliations` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `payment_refunds_transaction_status_idx` ON `payment_refunds` (`paymentTransactionId`,`status`);--> statement-breakpoint
CREATE INDEX `payment_transactions_profile_history_idx` ON `payment_transactions` (`profileId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `payment_transactions_reconcile_idx` ON `payment_transactions` (`provider`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `payment_webhook_events_status_idx` ON `payment_webhook_events` (`provider`,`status`,`receivedAt`);--> statement-breakpoint
CREATE INDEX `subscription_entitlements_active_idx` ON `subscription_entitlements` (`entitlementKey`,`status`,`endsAt`);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `sub_plan_version_fk` FOREIGN KEY (`membershipPlanVersionId`) REFERENCES `membership_plan_versions`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `sub_profile_fk` FOREIGN KEY (`profileId`) REFERENCES `member_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `subscriptions_plan_status_idx` ON `subscriptions` (`membershipPlanVersionId`,`status`);
