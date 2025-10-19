CREATE TABLE `practice_sessions` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`mode` enum('realtime','practice') NOT NULL,
	`signId` varchar(64),
	`duration` varchar(10),
	`detectionCount` varchar(10) DEFAULT '0',
	`successRate` varchar(10),
	`startedAt` timestamp DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `practice_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sign_vocabulary` (
	`id` varchar(64) NOT NULL,
	`classId` varchar(32) NOT NULL,
	`className` varchar(100) NOT NULL,
	`displayName` varchar(100) NOT NULL,
	`description` text,
	`category` varchar(50),
	`difficulty` enum('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `sign_vocabulary_id` PRIMARY KEY(`id`),
	CONSTRAINT `sign_vocabulary_classId_unique` UNIQUE(`classId`)
);
--> statement-breakpoint
CREATE TABLE `user_progress` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`signId` varchar(64) NOT NULL,
	`attempts` varchar(10) NOT NULL DEFAULT '0',
	`successCount` varchar(10) NOT NULL DEFAULT '0',
	`lastPracticed` timestamp DEFAULT (now()),
	`proficiencyLevel` enum('learning','practicing','mastered') NOT NULL DEFAULT 'learning',
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `user_progress_id` PRIMARY KEY(`id`)
);
