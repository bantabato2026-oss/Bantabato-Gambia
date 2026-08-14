ALTER TABLE `reports` ADD `reportedFamilyLinkId` int;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_reportedFamilyLinkId_family_links_id_fk` FOREIGN KEY (`reportedFamilyLinkId`) REFERENCES `family_links`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `reports_family_link_idx` ON `reports` (`reportedFamilyLinkId`,`status`);