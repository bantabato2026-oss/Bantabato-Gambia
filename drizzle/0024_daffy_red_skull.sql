ALTER TABLE `reports` ADD `clientRequestId` varchar(96);--> statement-breakpoint
ALTER TABLE `reports` ADD `memberUpdatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `reports` ADD `memberWithdrawnAt` timestamp;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_reporter_request_unique` UNIQUE(`reporterProfileId`,`clientRequestId`);