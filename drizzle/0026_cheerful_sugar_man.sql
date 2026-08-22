ALTER TABLE `membership_prices` ADD `effectiveFrom` timestamp;--> statement-breakpoint
ALTER TABLE `membership_prices` ADD `effectiveUntil` timestamp;--> statement-breakpoint
ALTER TABLE `payment_provider_configurations` ADD `environment` enum('not_configured','sandbox','live') DEFAULT 'not_configured' NOT NULL;