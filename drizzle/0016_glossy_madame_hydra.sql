CREATE TABLE `countries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`iso2` varchar(2) NOT NULL,
	`iso3` varchar(3) NOT NULL,
	`displayName` varchar(120) NOT NULL,
	`region` varchar(100) NOT NULL,
	`lifecycleStatus` enum('draft','configured','review','approved','active','paused','deactivated') NOT NULL DEFAULT 'draft',
	`defaultTimezone` varchar(80) NOT NULL,
	`active` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `countries_id` PRIMARY KEY(`id`),
	CONSTRAINT `countries_iso2_unique` UNIQUE(`iso2`),
	CONSTRAINT `countries_iso3_unique` UNIQUE(`iso3`)
);
--> statement-breakpoint
CREATE TABLE `country_currencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`countryId` int NOT NULL,
	`currencyId` int NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `country_currencies_id` PRIMARY KEY(`id`),
	CONSTRAINT `country_currency_unique` UNIQUE(`countryId`,`currencyId`)
);
--> statement-breakpoint
CREATE TABLE `country_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`countryId` int NOT NULL,
	`actorUserId` int,
	`eventType` enum('created','configured','submitted_for_review','approved','activated','paused','deactivated','policy_activated') NOT NULL,
	`safeMetadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `country_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `country_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`countryId` int NOT NULL,
	`policyVersion` varchar(64) NOT NULL,
	`status` enum('draft','active','retired') NOT NULL DEFAULT 'draft',
	`signupAvailability` enum('available','unavailable','coming_soon','requires_configuration') NOT NULL DEFAULT 'unavailable',
	`discoveryAvailability` enum('available','unavailable','coming_soon','requires_configuration') NOT NULL DEFAULT 'unavailable',
	`verificationAvailability` enum('available','unavailable','coming_soon','requires_configuration') NOT NULL DEFAULT 'requires_configuration',
	`paymentAvailability` enum('available','unavailable','coming_soon','requires_configuration') NOT NULL DEFAULT 'unavailable',
	`notificationAvailability` enum('available','unavailable','coming_soon','requires_configuration') NOT NULL DEFAULT 'requires_configuration',
	`phoneVerificationAvailability` enum('available','unavailable','coming_soon','requires_configuration') NOT NULL DEFAULT 'requires_configuration',
	`supportedLocaleCodes` json NOT NULL,
	`supportedNotificationChannels` json NOT NULL,
	`privacyConfiguration` json NOT NULL,
	`verificationConfiguration` json NOT NULL,
	`paymentConfiguration` json NOT NULL,
	`activatedAt` timestamp,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `country_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `country_policy_version_unique` UNIQUE(`countryId`,`policyVersion`)
);
--> statement-breakpoint
CREATE TABLE `currencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(3) NOT NULL,
	`displayName` varchar(120) NOT NULL,
	`symbol` varchar(12),
	`minorUnit` int NOT NULL DEFAULT 2,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `currencies_id` PRIMARY KEY(`id`),
	CONSTRAINT `currencies_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `locales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(16) NOT NULL,
	`displayName` varchar(120) NOT NULL,
	`direction` enum('ltr','rtl') NOT NULL DEFAULT 'ltr',
	`status` enum('available','coming_soon','requires_configuration') NOT NULL DEFAULT 'coming_soon',
	`fallbackLocaleCode` varchar(16),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `locales_id` PRIMARY KEY(`id`),
	CONSTRAINT `locales_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `member_international_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`longDistancePreference` enum('open','prefer_nearby','no_preference') NOT NULL DEFAULT 'no_preference',
	`futureResidenceOptions` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_international_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_intl_preferences_profile_unique` UNIQUE(`profileId`)
);
--> statement-breakpoint
CREATE TABLE `member_international_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`diasporaStatus` enum('living_in_gambia','living_outside_gambia','gambian_diaspora','international_member') NOT NULL DEFAULT 'living_in_gambia',
	`normalizedPhone` varchar(32),
	`phoneCountryId` int,
	`phoneVerificationStatus` enum('not_started','unavailable','pending','verified') NOT NULL DEFAULT 'not_started',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_international_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_intl_settings_profile_unique` UNIQUE(`profileId`)
);
--> statement-breakpoint
CREATE TABLE `member_preferred_countries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`countryId` int NOT NULL,
	`preferencePurpose` enum('discovery','future_residence') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `member_preferred_countries_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_pref_country_unique` UNIQUE(`profileId`,`countryId`,`preferencePurpose`)
);
--> statement-breakpoint
CREATE TABLE `member_profile_origins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`countryId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `member_profile_origins_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_origin_unique` UNIQUE(`profileId`,`countryId`)
);
--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `residenceCountryId` int;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `timezone` varchar(80) DEFAULT 'Africa/Banjul' NOT NULL;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `interfaceLocale` varchar(16) DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `locationVisibility` enum('eligible_members','matches_only','family_circle','hidden') DEFAULT 'eligible_members' NOT NULL;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `locationDetailLevel` enum('country','region','city') DEFAULT 'country' NOT NULL;--> statement-breakpoint
ALTER TABLE `country_currencies` ADD CONSTRAINT `cc_country_fk` FOREIGN KEY (`countryId`) REFERENCES `countries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `country_currencies` ADD CONSTRAINT `cc_currency_fk` FOREIGN KEY (`currencyId`) REFERENCES `currencies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `country_events` ADD CONSTRAINT `ce_country_fk` FOREIGN KEY (`countryId`) REFERENCES `countries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `country_events` ADD CONSTRAINT `ce_actor_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `country_policies` ADD CONSTRAINT `cp_country_fk` FOREIGN KEY (`countryId`) REFERENCES `countries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `country_policies` ADD CONSTRAINT `cp_actor_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_international_preferences` ADD CONSTRAINT `mip_profile_fk` FOREIGN KEY (`profileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_international_settings` ADD CONSTRAINT `mis_profile_fk` FOREIGN KEY (`profileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_international_settings` ADD CONSTRAINT `mis_phone_country_fk` FOREIGN KEY (`phoneCountryId`) REFERENCES `countries`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_preferred_countries` ADD CONSTRAINT `mpc_profile_fk` FOREIGN KEY (`profileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_preferred_countries` ADD CONSTRAINT `mpc_country_fk` FOREIGN KEY (`countryId`) REFERENCES `countries`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_profile_origins` ADD CONSTRAINT `mpo_profile_fk` FOREIGN KEY (`profileId`) REFERENCES `member_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_profile_origins` ADD CONSTRAINT `mpo_country_fk` FOREIGN KEY (`countryId`) REFERENCES `countries`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `countries_lifecycle_idx` ON `countries` (`lifecycleStatus`,`active`);--> statement-breakpoint
CREATE INDEX `country_currency_default_idx` ON `country_currencies` (`countryId`,`isDefault`);--> statement-breakpoint
CREATE INDEX `country_events_country_idx` ON `country_events` (`countryId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `country_policy_status_idx` ON `country_policies` (`countryId`,`status`,`activatedAt`);--> statement-breakpoint
CREATE INDEX `member_intl_phone_country_idx` ON `member_international_settings` (`phoneCountryId`,`phoneVerificationStatus`);--> statement-breakpoint
CREATE INDEX `member_pref_country_lookup_idx` ON `member_preferred_countries` (`countryId`,`preferencePurpose`);--> statement-breakpoint
CREATE INDEX `member_origin_country_idx` ON `member_profile_origins` (`countryId`,`profileId`);--> statement-breakpoint
ALTER TABLE `member_profiles` ADD CONSTRAINT `mp_res_country_fk` FOREIGN KEY (`residenceCountryId`) REFERENCES `countries`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `member_profiles_residence_country_idx` ON `member_profiles` (`residenceCountryId`,`profileStatus`,`searchVisible`);
