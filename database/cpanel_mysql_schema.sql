-- DEPRECATED: do not use this snapshot for new deployments.
-- Run `php artisan migrate --force` so the canonical ScaleCampusLab workflow
-- and every later integrity migration are applied in the correct order.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `role` enum('admin','university','school','high_school','student') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'student',
  `access_status` enum('active','pending','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `school_id` bigint unsigned DEFAULT NULL,
  `student_identifier` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `grade_level` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `interest_major` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_events` json DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_demo` tinyint(1) NOT NULL DEFAULT '0',
  `two_factor_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `security_alerts` tinyint(1) NOT NULL DEFAULT '1',
  `recovery_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_role_index` (`role`),
  KEY `users_access_status_index` (`access_status`),
  KEY `users_school_id_index` (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` bigint NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` bigint NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` smallint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `job_batches` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`),
  KEY `failed_jobs_connection_queue_failed_at_index` (`connection`,`queue`,`failed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `waitlist_signups` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('university','high_school','student') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `waitlist_signups_email_unique` (`email`),
  KEY `waitlist_signups_role_created_at_index` (`role`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `project_milestones` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `category` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('planned','in_progress','completed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'planned',
  `sort_order` smallint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `project_milestones_status_index` (`status`),
  KEY `project_milestones_sort_order_index` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `campus_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `university_user_id` bigint unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime DEFAULT NULL,
  `venue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `capacity` int unsigned NOT NULL,
  `status` enum('draft','published','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `campus_events_university_user_id_starts_at_index` (`university_user_id`,`starts_at`),
  KEY `campus_events_venue_starts_at_index` (`venue`,`starts_at`),
  KEY `campus_events_starts_at_index` (`starts_at`),
  KEY `campus_events_status_index` (`status`),
  CONSTRAINT `campus_events_university_user_id_foreign` FOREIGN KEY (`university_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `event_registrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `campus_event_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `registrant_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `registrant_email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `registrant_type` enum('student','school_group') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'student',
  `party_size` int unsigned NOT NULL DEFAULT '1',
  `status` enum('confirmed','waitlisted','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'confirmed',
  `attended_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `event_registrations_campus_event_id_registrant_email_unique` (`campus_event_id`,`registrant_email`),
  KEY `event_registrations_user_id_foreign` (`user_id`),
  KEY `event_registrations_registrant_type_index` (`registrant_type`),
  KEY `event_registrations_status_index` (`status`),
  KEY `event_registrations_campus_event_id_status_index` (`campus_event_id`,`status`),
  CONSTRAINT `event_registrations_campus_event_id_foreign` FOREIGN KEY (`campus_event_id`) REFERENCES `campus_events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_registrations_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `platform_notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `campus_event_id` bigint unsigned DEFAULT NULL,
  `channel` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'email',
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci,
  `status` enum('queued','sent','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'queued',
  `sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `platform_notifications_user_id_foreign` (`user_id`),
  KEY `platform_notifications_campus_event_id_foreign` (`campus_event_id`),
  KEY `platform_notifications_status_index` (`status`),
  CONSTRAINT `platform_notifications_campus_event_id_foreign` FOREIGN KEY (`campus_event_id`) REFERENCES `campus_events` (`id`) ON DELETE SET NULL,
  CONSTRAINT `platform_notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `target_schools` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `school_code` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `city` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `region` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `country` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'United States',
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `district` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `coordinator_name` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `coordinator_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('verified','pending','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'verified',
  `school_type` enum('public','private','ib_school','charter') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'private',
  `performance_tier` enum('elite','high','emerging','stable') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'stable',
  `average_sat` smallint unsigned DEFAULT NULL,
  `yield_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `match_score` tinyint unsigned NOT NULL DEFAULT '0',
  `active_applicants` int unsigned NOT NULL DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `target_schools_school_code_unique` (`school_code`),
  KEY `target_schools_status_index` (`status`),
  KEY `target_schools_performance_tier_index` (`performance_tier`),
  KEY `target_schools_match_score_index` (`match_score`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `visit_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `target_school_id` bigint unsigned NOT NULL,
  `campus_event_id` bigint unsigned DEFAULT NULL,
  `requested_by_user_id` bigint unsigned DEFAULT NULL,
  `requested_window` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('requested','approved','scheduled','declined') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requested',
  `priority` tinyint unsigned NOT NULL DEFAULT '1',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `visit_requests_target_school_id_foreign` (`target_school_id`),
  KEY `visit_requests_campus_event_id_foreign` (`campus_event_id`),
  KEY `visit_requests_requested_by_user_id_foreign` (`requested_by_user_id`),
  KEY `visit_requests_status_index` (`status`),
  CONSTRAINT `visit_requests_campus_event_id_foreign` FOREIGN KEY (`campus_event_id`) REFERENCES `campus_events` (`id`) ON DELETE SET NULL,
  CONSTRAINT `visit_requests_requested_by_user_id_foreign` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `visit_requests_target_school_id_foreign` FOREIGN KEY (`target_school_id`) REFERENCES `target_schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `visit_archives` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `target_school_id` bigint unsigned NOT NULL,
  `visited_on` date NOT NULL,
  `visit_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'School Fair',
  `leads_captured` int unsigned NOT NULL DEFAULT '0',
  `engagement_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `quality_score` decimal(3,1) NOT NULL DEFAULT '0.0',
  `status` enum('archived','synced','pending_sync') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'archived',
  `summary` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `visit_archives_target_school_id_foreign` (`target_school_id`),
  KEY `visit_archives_visited_on_index` (`visited_on`),
  KEY `visit_archives_status_index` (`status`),
  CONSTRAINT `visit_archives_target_school_id_foreign` FOREIGN KEY (`target_school_id`) REFERENCES `target_schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `visit_tasks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `visit_archive_id` bigint unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('open','done') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `ai_suggested` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `visit_tasks_visit_archive_id_foreign` (`visit_archive_id`),
  KEY `visit_tasks_status_index` (`status`),
  CONSTRAINT `visit_tasks_visit_archive_id_foreign` FOREIGN KEY (`visit_archive_id`) REFERENCES `visit_archives` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `platform_settings` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `migrations` (`migration`, `batch`) VALUES
('0001_01_01_000000_create_users_table', 1),
('0001_01_01_000001_create_cache_table', 1),
('0001_01_01_000002_create_jobs_table', 1),
('2026_07_09_000000_create_waitlist_signups_table', 2),
('2026_07_09_010000_add_role_to_users_table', 3),
('2026_07_10_100000_create_platform_foundation_tables', 4),
('2026_07_10_110000_create_recruitment_operations_tables', 5),
('2026_07_11_231000_create_platform_settings_table', 6);

SET FOREIGN_KEY_CHECKS = 1;
