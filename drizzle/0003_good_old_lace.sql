CREATE TABLE `profile_field_visibilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`fieldKey` varchar(80) NOT NULL,
	`audience` enum('public','verified_members','potential_matches','matched_members','family_circle','private','admin_restricted') NOT NULL DEFAULT 'potential_matches',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profile_field_visibilities_id` PRIMARY KEY(`id`),
	CONSTRAINT `profile_field_visibility_unique` UNIQUE(`profileId`,`fieldKey`)
);
--> statement-breakpoint
ALTER TABLE `member_preferences` ADD `preferredGenders` json;--> statement-breakpoint
ALTER TABLE `member_preferences` ADD `preferredMaritalStatuses` json;--> statement-breakpoint
ALTER TABLE `member_preferences` ADD `childrenPreference` enum('open','prefer_no_children','open_to_children','not_important');--> statement-breakpoint
ALTER TABLE `member_preferences` ADD `desiredChildrenPreference` enum('yes','no','open','not_important');--> statement-breakpoint
ALTER TABLE `member_preferences` ADD `preferredRelocation` json;--> statement-breakpoint
ALTER TABLE `member_preferences` ADD `preferredMarriageTimelines` json;--> statement-breakpoint
ALTER TABLE `member_preferences` ADD `preferredPolygynyOpenness` json;--> statement-breakpoint
ALTER TABLE `member_preferences` ADD `preferredFamilyInvolvement` json;--> statement-breakpoint
ALTER TABLE `member_preferences` ADD `lifestylePreferences` json;--> statement-breakpoint
ALTER TABLE `member_preferences` ADD `preferenceImportance` json;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `firstName` varchar(80);--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `region` varchar(100);--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `nationality` varchar(100);--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `languages` json;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `educationField` varchar(120);--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `educationInstitution` varchar(160);--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `employmentStatus` enum('employed','self_employed','student','seeking_work','retired','prefer_not_to_say');--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `industry` varchar(120);--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `personality` text;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `interests` json;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `hobbies` json;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `marriageIntent` varchar(255);--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `marriageExpectations` text;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `reasonSeekingMarriage` text;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `desireChildren` enum('yes','no','open','private');--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `familyInvolvementPreference` enum('active','limited','optional','private');--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `smokingPreference` enum('no','occasionally','yes','private');--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `alcoholPreference` enum('no','occasionally','yes','private');--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `values` text;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `importantPrinciples` text;--> statement-breakpoint
ALTER TABLE `profile_field_visibilities` ADD CONSTRAINT `profile_field_visibilities_profileId_member_profiles_id_fk` FOREIGN KEY (`profileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `profile_field_visibility_lookup_idx` ON `profile_field_visibilities` (`profileId`,`audience`);