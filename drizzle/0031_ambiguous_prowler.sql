CREATE TABLE `member_discovery_filters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`query` varchar(80),
	`minAge` int,
	`maxAge` int,
	`gender` enum('woman','man','self_described'),
	`religion` enum('muslim','christian'),
	`country` varchar(100),
	`residenceType` enum('gambia','diaspora'),
	`maritalStatus` enum('never_married','married','divorced','widowed'),
	`hasChildren` boolean,
	`relocationWillingness` enum('open','within_gambia','not_open','discuss'),
	`polygynyOpenness` enum('open','not_open','discuss','not_applicable'),
	`verifiedOnly` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_discovery_filters_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_discovery_filters_profile_unique` UNIQUE(`profileId`)
);
--> statement-breakpoint
ALTER TABLE `member_discovery_filters` ADD CONSTRAINT `member_discovery_filters_profileId_member_profiles_id_fk` FOREIGN KEY (`profileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;