-- CreateTable
CREATE TABLE `user` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `google_id` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `email_verified_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `role` ENUM('CLIENT', 'FREELANCER', 'ADMIN', 'ARBITRATOR') NULL,

    UNIQUE INDEX `user_email_key`(`email`),
    UNIQUE INDEX `user_google_id_key`(`google_id`),
    INDEX `user_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profile` (
    `user_id` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NULL,
    `last_name` VARCHAR(191) NULL,
    `phone_number` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `stripe_customer_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `profile_stripe_customer_id_key`(`stripe_customer_id`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_verify_token` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `email_verify_token_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_ban` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `admin_id` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `note` TEXT NULL,
    `expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lifted_at` DATETIME(3) NULL,
    `lifted_by_id` VARCHAR(191) NULL,

    INDEX `user_ban_user_id_idx`(`user_id`),
    INDEX `user_ban_admin_id_idx`(`admin_id`),
    INDEX `user_ban_lifted_by_id_idx`(`lifted_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `freelancer_language` (
    `freelancer_id` VARCHAR(191) NOT NULL,
    `languageCode` VARCHAR(10) NOT NULL,
    `proficiency` ENUM('BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_language_code`(`languageCode`),
    PRIMARY KEY (`freelancer_id`, `languageCode`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `freelancer` (
    `user_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NULL,
    `bio` MEDIUMTEXT NULL,
    `links` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `freelancer_connect_account` (
    `freelancer_id` VARCHAR(191) NOT NULL,
    `stripe_account_id` VARCHAR(191) NOT NULL,
    `account_type` ENUM('EXPRESS', 'STANDARD', 'CUSTOM') NOT NULL DEFAULT 'EXPRESS',
    `details_submitted` BOOLEAN NOT NULL DEFAULT false,
    `payouts_enabled` BOOLEAN NOT NULL DEFAULT false,
    `charges_enabled` BOOLEAN NOT NULL DEFAULT false,
    `country` VARCHAR(191) NULL,
    `default_currency` VARCHAR(191) NULL,
    `external_account_summary` JSON NULL,
    `requirements_due` JSON NULL,
    `requirements_currently_due` JSON NULL,
    `requirements_past_due` JSON NULL,
    `disabled_reason` VARCHAR(191) NULL,
    `disabled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `freelancer_connect_account_stripe_account_id_key`(`stripe_account_id`),
    PRIMARY KEY (`freelancer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `freelancer_payout` (
    `id` VARCHAR(191) NOT NULL,
    `freelancer_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'IN_TRANSIT', 'PAID', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `source` ENUM('PLATFORM', 'STRIPE_DASHBOARD') NOT NULL DEFAULT 'PLATFORM',
    `stripe_payout_id` VARCHAR(191) NULL,
    `stripe_balance_transaction_id` VARCHAR(191) NULL,
    `idem_key` VARCHAR(191) NULL,
    `description` VARCHAR(255) NULL,
    `failure_code` VARCHAR(255) NULL,
    `failure_message` VARCHAR(255) NULL,
    `metadata` JSON NULL,
    `stripe_created_at` DATETIME(3) NULL,
    `arrival_date` DATETIME(3) NULL,
    `requested_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `freelancer_payout_stripe_payout_id_key`(`stripe_payout_id`),
    UNIQUE INDEX `freelancer_payout_idem_key_key`(`idem_key`),
    INDEX `freelancer_payout_freelancer_id_idx`(`freelancer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `freelancer_payout_transfer` (
    `payout_id` VARCHAR(191) NOT NULL,
    `transfer_id` VARCHAR(191) NOT NULL,

    INDEX `freelancer_payout_transfer_transfer_id_idx`(`transfer_id`),
    PRIMARY KEY (`payout_id`, `transfer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `portfolio_project` (
    `id` VARCHAR(191) NOT NULL,
    `freelancer_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `role` VARCHAR(255) NULL,
    `description` MEDIUMTEXT NULL,
    `project_url` VARCHAR(191) NULL,
    `repository_url` VARCHAR(191) NULL,
    `visibility` ENUM('PUBLIC', 'PRIVATE', 'DRAFT') NOT NULL DEFAULT 'PUBLIC',
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` VARCHAR(191) NULL,

    INDEX `portfolio_project_freelancer_id_is_deleted_idx`(`freelancer_id`, `is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `portfolio_skill` (
    `portfolio_id` VARCHAR(191) NOT NULL,
    `skill_id` VARCHAR(191) NOT NULL,
    `note` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `portfolio_skill_skill_id_idx`(`skill_id`),
    PRIMARY KEY (`portfolio_id`, `skill_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `education` (
    `id` VARCHAR(191) NOT NULL,
    `freelancer_id` VARCHAR(191) NOT NULL,
    `school_name` VARCHAR(255) NOT NULL,
    `degree_title` VARCHAR(255) NOT NULL,
    `field_of_study` VARCHAR(255) NULL,
    `start_year` INTEGER NULL,
    `end_year` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `education_freelancer_id_start_year_idx`(`freelancer_id`, `start_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client` (
    `profile_user_id` VARCHAR(191) NOT NULL,
    `company_name` VARCHAR(191) NULL,
    `website_url` VARCHAR(191) NULL,
    `size` ENUM('JUST_ME', 'TWO_TO_NINE', 'TEN_TO_NINETY', 'HUNDRED_TO_K', 'MORE_THAN_K') NULL,
    `description` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`profile_user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset` (
    `id` VARCHAR(191) NOT NULL,
    `provider` ENUM('CLOUDINARY', 'S3', 'GCS', 'R2', 'MINIO') NULL,
    `kind` ENUM('IMAGE', 'VIDEO', 'FILE') NOT NULL,
    `public_id` VARCHAR(191) NULL,
    `bucket` VARCHAR(191) NULL,
    `storageKey` VARCHAR(191) NULL,
    `url` VARCHAR(2048) NULL,
    `mimeType` VARCHAR(191) NULL,
    `bytes` INTEGER NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `checksum_sha256` VARCHAR(191) NULL,
    `visibility` ENUM('PUBLIC', 'PRIVATE', 'AUTHENTICATED') NOT NULL DEFAULT 'PUBLIC',
    `status` ENUM('PENDING', 'READY', 'INFECTED', 'DELETED') NOT NULL DEFAULT 'PENDING',
    `createdBy` VARCHAR(191) NULL,
    `meta` JSON NULL,
    `parentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `asset_public_id_key`(`public_id`),
    UNIQUE INDEX `asset_storageKey_key`(`storageKey`),
    INDEX `asset_provider_bucket_storageKey_idx`(`provider`, `bucket`, `storageKey`),
    INDEX `asset_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_link` (
    `id` VARCHAR(191) NOT NULL,
    `ownerType` ENUM('USER', 'JOB', 'MESSAGE', 'PORTFOLIO') NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `role` ENUM('AVATAR', 'COVER', 'GALLERY', 'ATTACHMENT', 'BANNER', 'OTHER') NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `label` VARCHAR(191) NULL,
    `caption` VARCHAR(191) NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `createdBy` VARCHAR(191) NULL,
    `assetId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `asset_link_ownerType_ownerId_role_idx`(`ownerType`, `ownerId`, `role`),
    UNIQUE INDEX `asset_link_ownerType_ownerId_role_position_key`(`ownerType`, `ownerId`, `role`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_post_attachment` (
    `id` VARCHAR(191) NOT NULL,
    `job_id` VARCHAR(191) NOT NULL,
    `asset_link_id` VARCHAR(191) NOT NULL,
    `added_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `job_post_attachment_asset_link_id_key`(`asset_link_id`),
    INDEX `job_post_attachment_job_id_idx`(`job_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_post` (
    `id` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `specialty_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` MEDIUMTEXT NOT NULL,
    `payment_mode` ENUM('FIXED_SINGLE', 'FIXED_MILESTONE') NOT NULL,
    `budget_amount` DECIMAL(12, 2) NULL,
    `budget_currency` VARCHAR(191) NULL,
    `duration` ENUM('LESS_THAN_ONE_MONTH', 'ONE_TO_THREE_MONTHS', 'THREE_TO_SIX_MONTHS', 'MORE_THAN_SIX_MONTHS') NULL,
    `experience_level` ENUM('ENTRY', 'INTERMEDIATE', 'EXPERT') NOT NULL,
    `location_type` ENUM('REMOTE', 'HYBRID', 'ON_SITE') NOT NULL DEFAULT 'REMOTE',
    `preferred_locations` JSON NULL,
    `custom_terms` JSON NULL,
    `visibility` ENUM('PUBLIC', 'INVITE_ONLY', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC',
    `status` ENUM('DRAFT', 'PUBLISHED', 'PUBLISHED_PENDING_REVIEW', 'PAUSED', 'CLOSED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `form_version` ENUM('VERSION_1', 'VERSION_2', 'VERSION_3') NOT NULL DEFAULT 'VERSION_1',
    `published_at` DATETIME(3) NULL,
    `closed_at` DATETIME(3) NULL,
    `moderation_score` DOUBLE NULL,
    `moderation_category` VARCHAR(128) NULL,
    `moderation_summary` VARCHAR(255) NULL,
    `moderation_payload` JSON NULL,
    `moderation_checked_at` DATETIME(3) NULL,
    `proposals_count` INTEGER NOT NULL DEFAULT 0,
    `views_count` INTEGER NOT NULL DEFAULT 0,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `job_post_client_id_status_is_deleted_idx`(`client_id`, `status`, `is_deleted`),
    INDEX `job_post_specialty_id_status_is_deleted_idx`(`specialty_id`, `status`, `is_deleted`),
    INDEX `job_post_status_visibility_is_deleted_idx`(`status`, `visibility`, `is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `freelancer_saved_job` (
    `freelancer_id` VARCHAR(191) NOT NULL,
    `job_post_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`freelancer_id`, `job_post_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_saved_freelancer` (
    `client_id` VARCHAR(191) NOT NULL,
    `freelancer_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`client_id`, `freelancer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_language_requirement` (
    `job_id` VARCHAR(191) NOT NULL,
    `language_code` VARCHAR(10) NOT NULL,
    `proficiency` ENUM('BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE') NOT NULL DEFAULT 'CONVERSATIONAL',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`job_id`, `language_code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_required_skill` (
    `job_id` VARCHAR(191) NOT NULL,
    `skill_id` VARCHAR(191) NOT NULL,
    `order_hint` INTEGER NULL,
    `is_preferred` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `job_required_skill_skill_id_idx`(`skill_id`),
    PRIMARY KEY (`job_id`, `skill_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_screening_question` (
    `id` VARCHAR(191) NOT NULL,
    `job_id` VARCHAR(191) NOT NULL,
    `question` VARCHAR(500) NOT NULL,
    `order_index` INTEGER NOT NULL DEFAULT 0,
    `is_required` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `job_screening_question_job_id_order_index_idx`(`job_id`, `order_index`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_invitation` (
    `id` VARCHAR(191) NOT NULL,
    `job_id` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `freelancer_id` VARCHAR(191) NOT NULL,
    `message` MEDIUMTEXT NULL,
    `status` ENUM('SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED') NOT NULL DEFAULT 'SENT',
    `sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `responded_at` DATETIME(3) NULL,
    `expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `job_invitation_freelancer_id_status_idx`(`freelancer_id`, `status`),
    UNIQUE INDEX `job_invitation_job_id_freelancer_id_key`(`job_id`, `freelancer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_proposal` (
    `id` VARCHAR(191) NOT NULL,
    `job_id` VARCHAR(191) NOT NULL,
    `freelancer_id` VARCHAR(191) NOT NULL,
    `invitation_id` VARCHAR(191) NULL,
    `cover_letter` MEDIUMTEXT NULL,
    `bid_amount` DECIMAL(12, 2) NULL,
    `bid_currency` VARCHAR(191) NULL,
    `estimated_duration` ENUM('LESS_THAN_ONE_MONTH', 'ONE_TO_THREE_MONTHS', 'THREE_TO_SIX_MONTHS', 'MORE_THAN_SIX_MONTHS') NULL,
    `status` ENUM('SUBMITTED', 'SHORTLISTED', 'INTERVIEWING', 'HIRED', 'DECLINED', 'WITHDRAWN') NOT NULL DEFAULT 'SUBMITTED',
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `withdrawn_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `job_proposal_job_id_status_idx`(`job_id`, `status`),
    INDEX `job_proposal_freelancer_id_status_idx`(`freelancer_id`, `status`),
    UNIQUE INDEX `job_proposal_job_id_freelancer_id_key`(`job_id`, `freelancer_id`),
    UNIQUE INDEX `job_proposal_invitation_id_key`(`invitation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_activity_log` (
    `id` VARCHAR(191) NOT NULL,
    `job_id` VARCHAR(191) NOT NULL,
    `actor_id` VARCHAR(191) NULL,
    `actor_role` ENUM('CLIENT', 'FREELANCER', 'ADMIN', 'ARBITRATOR') NULL,
    `action` VARCHAR(100) NOT NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `job_activity_log_job_id_created_at_idx`(`job_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_offer` (
    `id` VARCHAR(191) NOT NULL,
    `job_id` VARCHAR(191) NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `freelancer_id` VARCHAR(191) NOT NULL,
    `proposal_id` VARCHAR(191) NULL,
    `invitation_id` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` MEDIUMTEXT NULL,
    `type` ENUM('FIXED_PRICE') NOT NULL DEFAULT 'FIXED_PRICE',
    `currency` VARCHAR(191) NOT NULL,
    `fixed_price` DECIMAL(12, 2) NOT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `expire_at` DATETIME(3) NULL,
    `status` ENUM('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
    `sent_at` DATETIME(3) NULL,
    `responded_at` DATETIME(3) NULL,
    `withdraw_reason` VARCHAR(255) NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_job_offer_job`(`job_id`),
    INDEX `idx_job_offer_client_status`(`client_id`, `status`, `is_deleted`),
    INDEX `idx_job_offer_freelancer_status`(`freelancer_id`, `status`, `is_deleted`),
    INDEX `idx_job_offer_proposal`(`proposal_id`),
    INDEX `idx_job_offer_invitation`(`invitation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `match_interaction` (
    `id` VARCHAR(191) NOT NULL,
    `job_id` VARCHAR(191) NULL,
    `freelancer_id` VARCHAR(191) NULL,
    `client_id` VARCHAR(191) NULL,
    `proposal_id` VARCHAR(191) NULL,
    `invitation_id` VARCHAR(191) NULL,
    `actor_profile_id` VARCHAR(191) NULL,
    `actor_role` ENUM('CLIENT', 'FREELANCER', 'ADMIN', 'ARBITRATOR') NULL,
    `type` ENUM('JOB_VIEW', 'PROFILE_VIEW', 'PROPOSAL_SUBMITTED', 'PROPOSAL_SHORTLISTED', 'PROPOSAL_INTERVIEWING', 'PROPOSAL_HIRED', 'INVITATION_SENT', 'INVITATION_ACCEPTED') NOT NULL,
    `source` ENUM('DIRECT', 'SEARCH', 'RECOMMENDATION', 'SYSTEM') NOT NULL DEFAULT 'DIRECT',
    `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_match_interaction_job`(`job_id`, `occurred_at`),
    INDEX `idx_match_interaction_freelancer`(`freelancer_id`, `occurred_at`),
    INDEX `idx_match_interaction_client`(`client_id`, `occurred_at`),
    INDEX `idx_match_interaction_type`(`type`, `occurred_at`),
    INDEX `idx_match_interaction_actor`(`actor_profile_id`, `occurred_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification` (
    `id` VARCHAR(191) NOT NULL,
    `recipient_id` VARCHAR(191) NOT NULL,
    `actor_id` VARCHAR(191) NULL,
    `category` ENUM('JOB', 'PROPOSAL', 'CONTRACT', 'DISPUTE', 'SYSTEM') NOT NULL,
    `event` ENUM('JOB_INVITATION_CREATED', 'JOB_INVITATION_CANCELLED', 'JOB_INVITATION_ACCEPTED', 'JOB_INVITATION_DECLINED', 'JOB_HIRE', 'JOB_ACCEPT', 'JOB_OFFER_SENT', 'JOB_OFFER_UPDATED', 'JOB_OFFER_WITHDRAWN', 'JOB_OFFER_DECLINED', 'PROPOSAL_SUBMITTED', 'CONTRACT_MILESTONE_CREATED', 'CONTRACT_MILESTONE_SUBMITTED', 'CONTRACT_MILESTONE_APPROVED', 'CONTRACT_MILESTONE_DECLINED', 'CONTRACT_MILESTONE_CANCELLATION_REQUESTED', 'DISPUTE_CREATED', 'DISPUTE_UPDATED', 'SYSTEM_MESSAGE') NOT NULL,
    `resource_type` ENUM('JOB_POST', 'JOB_INVITATION', 'JOB_PROPOSAL', 'JOB_OFFER', 'CONTRACT', 'CONTRACT_MILESTONE', 'MILESTONE_SUBMISSION', 'DISPUTE', 'SYSTEM') NULL,
    `resource_id` VARCHAR(191) NULL,
    `payload` JSON NULL,
    `status` ENUM('PENDING', 'DELIVERED', 'READ') NOT NULL DEFAULT 'PENDING',
    `read_at` DATETIME(3) NULL,
    `delivered_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` VARCHAR(191) NULL,

    INDEX `idx_notification_recipient_status`(`recipient_id`, `status`, `created_at`),
    INDEX `idx_notification_resource`(`resource_type`, `resource_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Contract` (
    `id` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `freelancer_id` VARCHAR(191) NOT NULL,
    `job_post_id` VARCHAR(191) NULL,
    `proposal_id` VARCHAR(191) NULL,
    `offer_id` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `closure_type` ENUM('COMPLETED', 'CANCELLED', 'AUTO_RELEASED') NULL,
    `closure_reason` MEDIUMTEXT NULL,
    `ended_at` DATETIME(3) NULL,
    `closed_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Contract_proposal_id_key`(`proposal_id`),
    UNIQUE INDEX `Contract_offer_id_key`(`offer_id`),
    INDEX `Contract_job_post_id_idx`(`job_post_id`),
    INDEX `Contract_closed_by_id_idx`(`closed_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contract_feedback` (
    `id` VARCHAR(191) NOT NULL,
    `contract_id` VARCHAR(191) NOT NULL,
    `reviewer_id` VARCHAR(191) NOT NULL,
    `reviewee_id` VARCHAR(191) NOT NULL,
    `role` ENUM('CLIENT', 'FREELANCER', 'SYSTEM') NOT NULL,
    `rating` TINYINT UNSIGNED NOT NULL,
    `comment` MEDIUMTEXT NULL,
    `would_hire_again` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `contract_feedback_reviewee_id_idx`(`reviewee_id`),
    UNIQUE INDEX `contract_feedback_contract_id_reviewer_id_key`(`contract_id`, `reviewer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Milestone` (
    `id` VARCHAR(191) NOT NULL,
    `contract_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `start_at` DATETIME(3) NULL,
    `end_at` DATETIME(3) NULL,
    `status` ENUM('OPEN', 'SUBMITTED', 'APPROVED', 'RELEASED', 'CANCELED') NOT NULL DEFAULT 'OPEN',
    `escrow_id` VARCHAR(191) NOT NULL,
    `submitted_at` DATETIME(3) NULL,
    `approved_submission_id` VARCHAR(191) NULL,
    `approved_at` DATETIME(3) NULL,
    `released_at` DATETIME(3) NULL,
    `cancellation_status` ENUM('PENDING', 'ACCEPTED', 'DECLINED') NULL,
    `cancellation_requested_at` DATETIME(3) NULL,
    `cancellation_reason` MEDIUMTEXT NULL,
    `cancellation_responded_at` DATETIME(3) NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Milestone_approved_submission_id_key`(`approved_submission_id`),
    INDEX `Milestone_approved_submission_id_idx`(`approved_submission_id`),
    INDEX `Milestone_contract_id_is_deleted_idx`(`contract_id`, `is_deleted`),
    INDEX `idx_milestone_cancellation_status`(`cancellation_status`),
    UNIQUE INDEX `Milestone_escrow_id_key`(`escrow_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `milestone_resource` (
    `id` VARCHAR(191) NOT NULL,
    `milestone_id` VARCHAR(191) NOT NULL,
    `asset_id` VARCHAR(191) NULL,
    `url` VARCHAR(2048) NULL,
    `name` VARCHAR(255) NULL,
    `mime_type` VARCHAR(255) NULL,
    `size_bytes` INTEGER NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `milestone_resource_milestone_id_idx`(`milestone_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `milestone_submission` (
    `id` VARCHAR(191) NOT NULL,
    `milestone_id` VARCHAR(191) NOT NULL,
    `freelancer_id` VARCHAR(191) NOT NULL,
    `message` MEDIUMTEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `review_note` MEDIUMTEXT NULL,
    `review_rating` TINYINT UNSIGNED NULL,
    `reviewed_at` DATETIME(3) NULL,
    `reviewed_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `milestone_submission_milestone_id_status_idx`(`milestone_id`, `status`),
    INDEX `milestone_submission_freelancer_id_idx`(`freelancer_id`),
    INDEX `milestone_submission_reviewed_by_id_idx`(`reviewed_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `milestone_submission_attachment` (
    `id` VARCHAR(191) NOT NULL,
    `submission_id` VARCHAR(191) NOT NULL,
    `asset_id` VARCHAR(191) NULL,
    `url` VARCHAR(2048) NULL,
    `name` VARCHAR(255) NULL,
    `mime_type` VARCHAR(255) NULL,
    `size_bytes` INTEGER NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `milestone_submission_attachment_submission_id_idx`(`submission_id`),
    INDEX `milestone_submission_attachment_asset_id_idx`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Escrow` (
    `id` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `amount_funded` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `amount_released` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `amount_refunded` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `status` ENUM('UNFUNDED', 'FUNDED', 'PARTIALLY_RELEASED', 'RELEASED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'DISPUTED') NOT NULL DEFAULT 'UNFUNDED',
    `flatform_fee_total` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `processing_fee_total` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `tax_with_holding_total` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `escrow_id` VARCHAR(191) NULL,
    `type` ENUM('ESCROW_MILESTONE', 'PLATFORM_SERVICE', 'ARBITRATION_FEE') NOT NULL DEFAULT 'ESCROW_MILESTONE',
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `status` ENUM('REQUIRES_ACTION', 'SUCCEEDED', 'REFUNDED', 'FAILED') NOT NULL,
    `payment_intent_id` VARCHAR(191) NOT NULL,
    `charge_id` VARCHAR(191) NULL,
    `cardBrand` VARCHAR(191) NULL,
    `cardLast4` CHAR(4) NULL,
    `cardExpMonth` TINYINT UNSIGNED NULL,
    `cardExpYear` SMALLINT UNSIGNED NULL,
    `cardFingerprint` CHAR(32) NULL,
    `payer_id` VARCHAR(191) NULL,
    `payer_role` ENUM('CLIENT', 'FREELANCER', 'ADMIN', 'ARBITRATOR') NULL,
    `dispute_id` VARCHAR(191) NULL,
    `idem_key` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Payment_payment_intent_id_key`(`payment_intent_id`),
    UNIQUE INDEX `Payment_idem_key_key`(`idem_key`),
    INDEX `Payment_escrow_id_idx`(`escrow_id`),
    INDEX `Payment_dispute_id_idx`(`dispute_id`),
    INDEX `Payment_payer_id_idx`(`payer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transfer` (
    `id` VARCHAR(191) NOT NULL,
    `escrow_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'REVERSED') NOT NULL,
    `tranfer_id` VARCHAR(191) NULL,
    `destination_account_id` VARCHAR(191) NOT NULL,
    `idem_key` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Transfer_tranfer_id_key`(`tranfer_id`),
    UNIQUE INDEX `Transfer_idem_key_key`(`idem_key`),
    INDEX `Transfer_escrow_id_idx`(`escrow_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Refund` (
    `id` VARCHAR(191) NOT NULL,
    `escrow_id` VARCHAR(191) NOT NULL,
    `payment_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'SUCCEEDED', 'FAILED') NOT NULL,
    `stripe_refund_id` VARCHAR(191) NULL,
    `idem_key` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Refund_stripe_refund_id_key`(`stripe_refund_id`),
    UNIQUE INDEX `Refund_idem_key_key`(`idem_key`),
    INDEX `Refund_escrow_id_idx`(`escrow_id`),
    INDEX `Refund_payment_id_idx`(`payment_id`),
    UNIQUE INDEX `Refund_payment_id_key`(`payment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Dispute` (
    `id` VARCHAR(191) NOT NULL,
    `escrowId` VARCHAR(191) NOT NULL,
    `openedById` VARCHAR(191) NOT NULL,
    `status` ENUM('OPEN', 'NEGOTIATION', 'INTERNAL_MEDIATION', 'AWAITING_ARBITRATION_FEES', 'ARBITRATION_READY', 'ARBITRATION', 'RESOLVED_RELEASE_ALL', 'RESOLVED_REFUND_ALL', 'RESOLVED_SPLIT', 'CANCELED', 'EXPIRED') NOT NULL DEFAULT 'OPEN',
    `latest_proposal_id` VARCHAR(191) NULL,
    `locked_at` DATETIME(3) NULL,
    `locked_by_id` VARCHAR(191) NULL,
    `arbitrator_id` VARCHAR(191) NULL,
    `arbitrator_assigned_at` DATETIME(3) NULL,
    `proposed_release` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `proposed_refund` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `arb_fee_per_party` DECIMAL(12, 2) NOT NULL DEFAULT 10,
    `client_arb_fee_paid` BOOLEAN NOT NULL DEFAULT false,
    `freelancer_arb_fee_paid` BOOLEAN NOT NULL DEFAULT false,
    `response_deadline` DATETIME(3) NULL,
    `arbitration_deadline` DATETIME(3) NULL,
    `current_dossier_version` INTEGER NULL,
    `decided_release` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `decided_refund` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `decided_by_id` VARCHAR(191) NULL,
    `decided_at` DATETIME(3) NULL,
    `decision_summary` TEXT NULL,
    `decision_reasoning` TEXT NULL,
    `note` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Dispute_escrowId_key`(`escrowId`),
    UNIQUE INDEX `Dispute_latest_proposal_id_key`(`latest_proposal_id`),
    INDEX `idx_dispute_arbitrator`(`arbitrator_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `arbitration_dossier` (
    `id` VARCHAR(191) NOT NULL,
    `dispute_id` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('DRAFT', 'LOCKED', 'FINALIZED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `generated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `generated_by_id` VARCHAR(191) NULL,
    `locked_at` DATETIME(3) NULL,
    `finalized_at` DATETIME(3) NULL,
    `hash` VARCHAR(191) NULL,
    `payload` JSON NOT NULL,
    `pdf_url` VARCHAR(191) NULL,
    `notes` TEXT NULL,

    INDEX `idx_arbitration_dossier_dispute`(`dispute_id`),
    UNIQUE INDEX `arbitration_dossier_dispute_id_version_key`(`dispute_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `arbitration_evidence_submission` (
    `id` VARCHAR(191) NOT NULL,
    `dispute_id` VARCHAR(191) NOT NULL,
    `submitted_by_id` VARCHAR(191) NOT NULL,
    `statement` TEXT NULL,
    `no_additional_evidence` BOOLEAN NOT NULL DEFAULT false,
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `arbitration_evidence_submission_dispute_id_idx`(`dispute_id`),
    UNIQUE INDEX `arbitration_evidence_submission_dispute_id_submitted_by_id_key`(`dispute_id`, `submitted_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `arbitration_evidence_item` (
    `id` VARCHAR(191) NOT NULL,
    `submission_id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `source_type` ENUM('MILESTONE_ATTACHMENT', 'CHAT_ATTACHMENT', 'ASSET', 'EXTERNAL_URL') NOT NULL,
    `source_id` VARCHAR(191) NULL,
    `url` VARCHAR(2048) NULL,
    `asset_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `arbitration_evidence_item_submission_id_idx`(`submission_id`),
    INDEX `arbitration_evidence_item_asset_id_idx`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `arbitration_decision_attachment` (
    `id` VARCHAR(191) NOT NULL,
    `dispute_id` VARCHAR(191) NOT NULL,
    `asset_id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_arbitration_decision_attachment_dispute`(`dispute_id`),
    INDEX `idx_arbitration_decision_attachment_asset`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dispute_negotiation` (
    `id` VARCHAR(191) NOT NULL,
    `dispute_id` VARCHAR(191) NOT NULL,
    `proposer_id` VARCHAR(191) NOT NULL,
    `counterparty_id` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `release_amount` DECIMAL(12, 2) NOT NULL,
    `refund_amount` DECIMAL(12, 2) NOT NULL,
    `message` TEXT NULL,
    `responded_by_id` VARCHAR(191) NULL,
    `responded_at` DATETIME(3) NULL,
    `response_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `dispute_negotiation_dispute_id_idx`(`dispute_id`),
    INDEX `dispute_negotiation_proposer_id_idx`(`proposer_id`),
    INDEX `dispute_negotiation_counterparty_id_idx`(`counterparty_id`),
    INDEX `dispute_negotiation_responded_by_id_idx`(`responded_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_thread` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('PROJECT', 'ADMIN_CLIENT', 'ADMIN_FREELANCER') NOT NULL,
    `job_post_id` VARCHAR(191) NULL,
    `contract_id` VARCHAR(191) NULL,
    `subject` VARCHAR(255) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `chat_thread_type_job_post_id_idx`(`type`, `job_post_id`),
    INDEX `chat_thread_type_contract_id_idx`(`type`, `contract_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_participant` (
    `id` VARCHAR(191) NOT NULL,
    `thread_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `role` ENUM('CLIENT', 'FREELANCER', 'ADMIN', 'ARBITRATOR') NOT NULL,
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `left_at` DATETIME(3) NULL,
    `last_read_message_id` VARCHAR(191) NULL,
    `last_read_at` DATETIME(3) NULL,
    `is_muted` BOOLEAN NOT NULL DEFAULT false,
    `metadata` JSON NULL,

    INDEX `chat_participant_user_id_idx`(`user_id`),
    UNIQUE INDEX `chat_participant_thread_id_user_id_key`(`thread_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_message` (
    `id` VARCHAR(191) NOT NULL,
    `thread_id` VARCHAR(191) NOT NULL,
    `sender_id` VARCHAR(191) NULL,
    `sender_role` ENUM('CLIENT', 'FREELANCER', 'ADMIN', 'ARBITRATOR') NULL,
    `type` ENUM('USER', 'SYSTEM') NOT NULL DEFAULT 'USER',
    `body` TEXT NULL,
    `rich_payload` JSON NULL,
    `sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `edited_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_message_thread_id_sent_at_idx`(`thread_id`, `sent_at`),
    INDEX `chat_message_sender_id_idx`(`sender_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_message_attachment` (
    `id` VARCHAR(191) NOT NULL,
    `message_id` VARCHAR(191) NOT NULL,
    `asset_id` VARCHAR(191) NULL,
    `url` VARCHAR(2048) NULL,
    `name` VARCHAR(255) NULL,
    `mime_type` VARCHAR(255) NULL,
    `size_bytes` INTEGER NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_message_attachment_message_id_idx`(`message_id`),
    INDEX `chat_message_attachment_asset_id_idx`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_message_receipt` (
    `id` VARCHAR(191) NOT NULL,
    `message_id` VARCHAR(191) NOT NULL,
    `participant_id` VARCHAR(191) NOT NULL,
    `delivered_at` DATETIME(3) NULL,
    `read_at` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_message_receipt_participant_id_read_at_idx`(`participant_id`, `read_at`),
    UNIQUE INDEX `chat_message_receipt_message_id_participant_id_key`(`message_id`, `participant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_admin_access_log` (
    `id` VARCHAR(191) NOT NULL,
    `thread_id` VARCHAR(191) NOT NULL,
    `admin_id` VARCHAR(191) NOT NULL,
    `dispute_id` VARCHAR(191) NULL,
    `action` ENUM('VIEW_THREAD', 'EXPORT_TRANSCRIPT', 'DOWNLOAD_ATTACHMENT') NOT NULL DEFAULT 'VIEW_THREAD',
    `reason` VARCHAR(255) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_admin_access_log_admin_id_created_at_idx`(`admin_id`, `created_at`),
    INDEX `chat_admin_access_log_dispute_id_idx`(`dispute_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentMethodRef` (
    `id` VARCHAR(191) NOT NULL,
    `profile_id` VARCHAR(191) NOT NULL,
    `stripe_customer_id` VARCHAR(191) NOT NULL,
    `payment_method_id` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `last_name` VARCHAR(191) NOT NULL,
    `brand` VARCHAR(191) NULL,
    `last4` VARCHAR(191) NULL,
    `exp_month` INTEGER NULL,
    `exp_year` INTEGER NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `billing_country` VARCHAR(191) NULL,
    `billing_city` VARCHAR(191) NULL,
    `billing_line1` VARCHAR(191) NULL,
    `billing_line2` VARCHAR(191) NULL,
    `billing_postal` VARCHAR(191) NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` VARCHAR(191) NULL,

    INDEX `PaymentMethodRef_profile_id_idx`(`profile_id`),
    UNIQUE INDEX `PaymentMethodRef_stripe_customer_id_payment_method_id_key`(`stripe_customer_id`, `payment_method_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WebhookEventLog` (
    `id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `raw` JSON NOT NULL,
    `processed` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `WebhookEventLog_event_id_key`(`event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `description` MEDIUMTEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` VARCHAR(191) NULL,

    UNIQUE INDEX `Category_slug_key`(`slug`),
    INDEX `Category_name_slug_idx`(`name`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Specialty` (
    `id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` MEDIUMTEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` VARCHAR(191) NULL,

    UNIQUE INDEX `Specialty_slug_key`(`slug`),
    INDEX `Specialty_category_id_idx`(`category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Skill` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` MEDIUMTEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` VARCHAR(191) NULL,

    UNIQUE INDEX `Skill_slug_key`(`slug`),
    INDEX `Skill_name_is_deleted_idx`(`name`, `is_deleted`),
    INDEX `Skill_slug_is_deleted_idx`(`slug`, `is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `category_skill` (
    `category_id` VARCHAR(191) NOT NULL,
    `skill_id` VARCHAR(191) NOT NULL,
    `weight` INTEGER NOT NULL DEFAULT 50,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` VARCHAR(191) NULL,

    INDEX `category_skill_skill_id_idx`(`skill_id`),
    PRIMARY KEY (`category_id`, `skill_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `specialty_skill` (
    `specialty_id` VARCHAR(191) NOT NULL,
    `skill_id` VARCHAR(191) NOT NULL,
    `weight` INTEGER NOT NULL DEFAULT 70,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` VARCHAR(191) NULL,

    INDEX `specialty_skill_skill_id_idx`(`skill_id`),
    PRIMARY KEY (`specialty_id`, `skill_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `freelancer_category_selection` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `profile_id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NOT NULL,
    `picked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` VARCHAR(191) NULL,

    INDEX `freelancer_category_selection_category_id_is_deleted_idx`(`category_id`, `is_deleted`),
    INDEX `freelancer_category_selection_profile_id_is_deleted_picked_a_idx`(`profile_id`, `is_deleted`, `picked_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `freelancer_specialty_selection` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `specialtyId` VARCHAR(191) NOT NULL,
    `pickedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deletedAt` DATETIME(3) NULL,
    `deletedBy` VARCHAR(191) NULL,

    INDEX `freelancer_specialty_selection_userId_is_deleted_idx`(`userId`, `is_deleted`),
    INDEX `freelancer_specialty_selection_specialtyId_is_deleted_idx`(`specialtyId`, `is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `freelancer_skill_selection` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `skillId` VARCHAR(191) NOT NULL,
    `orderHint` INTEGER NULL,
    `pickedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deletedAt` DATETIME(3) NULL,
    `deletedBy` VARCHAR(191) NULL,

    INDEX `freelancer_skill_selection_userId_is_deleted_idx`(`userId`, `is_deleted`),
    INDEX `freelancer_skill_selection_skillId_is_deleted_idx`(`skillId`, `is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `profile` ADD CONSTRAINT `profile_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_verify_token` ADD CONSTRAINT `email_verify_token_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_ban` ADD CONSTRAINT `user_ban_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_ban` ADD CONSTRAINT `user_ban_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_ban` ADD CONSTRAINT `user_ban_lifted_by_id_fkey` FOREIGN KEY (`lifted_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_language` ADD CONSTRAINT `freelancer_language_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer` ADD CONSTRAINT `freelancer_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `profile`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_connect_account` ADD CONSTRAINT `freelancer_connect_account_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_payout` ADD CONSTRAINT `freelancer_payout_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_payout_transfer` ADD CONSTRAINT `freelancer_payout_transfer_payout_id_fkey` FOREIGN KEY (`payout_id`) REFERENCES `freelancer_payout`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_payout_transfer` ADD CONSTRAINT `freelancer_payout_transfer_transfer_id_fkey` FOREIGN KEY (`transfer_id`) REFERENCES `Transfer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `portfolio_project` ADD CONSTRAINT `portfolio_project_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `portfolio_skill` ADD CONSTRAINT `portfolio_skill_portfolio_id_fkey` FOREIGN KEY (`portfolio_id`) REFERENCES `portfolio_project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `portfolio_skill` ADD CONSTRAINT `portfolio_skill_skill_id_fkey` FOREIGN KEY (`skill_id`) REFERENCES `Skill`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `education` ADD CONSTRAINT `education_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client` ADD CONSTRAINT `client_profile_user_id_fkey` FOREIGN KEY (`profile_user_id`) REFERENCES `profile`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset` ADD CONSTRAINT `asset_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_link` ADD CONSTRAINT `asset_link_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `asset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_post_attachment` ADD CONSTRAINT `job_post_attachment_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job_post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_post_attachment` ADD CONSTRAINT `job_post_attachment_asset_link_id_fkey` FOREIGN KEY (`asset_link_id`) REFERENCES `asset_link`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_post` ADD CONSTRAINT `job_post_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`profile_user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_post` ADD CONSTRAINT `job_post_specialty_id_fkey` FOREIGN KEY (`specialty_id`) REFERENCES `Specialty`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_saved_job` ADD CONSTRAINT `freelancer_saved_job_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_saved_job` ADD CONSTRAINT `freelancer_saved_job_job_post_id_fkey` FOREIGN KEY (`job_post_id`) REFERENCES `job_post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_saved_freelancer` ADD CONSTRAINT `client_saved_freelancer_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`profile_user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_saved_freelancer` ADD CONSTRAINT `client_saved_freelancer_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_language_requirement` ADD CONSTRAINT `job_language_requirement_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job_post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_required_skill` ADD CONSTRAINT `job_required_skill_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job_post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_required_skill` ADD CONSTRAINT `job_required_skill_skill_id_fkey` FOREIGN KEY (`skill_id`) REFERENCES `Skill`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_screening_question` ADD CONSTRAINT `job_screening_question_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job_post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_invitation` ADD CONSTRAINT `job_invitation_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job_post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_invitation` ADD CONSTRAINT `job_invitation_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`profile_user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_invitation` ADD CONSTRAINT `job_invitation_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_proposal` ADD CONSTRAINT `job_proposal_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job_post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_proposal` ADD CONSTRAINT `job_proposal_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_proposal` ADD CONSTRAINT `job_proposal_invitation_id_fkey` FOREIGN KEY (`invitation_id`) REFERENCES `job_invitation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_activity_log` ADD CONSTRAINT `job_activity_log_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job_post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_activity_log` ADD CONSTRAINT `job_activity_log_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_offer` ADD CONSTRAINT `job_offer_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job_post`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_offer` ADD CONSTRAINT `job_offer_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`profile_user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_offer` ADD CONSTRAINT `job_offer_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_offer` ADD CONSTRAINT `job_offer_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `job_proposal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_offer` ADD CONSTRAINT `job_offer_invitation_id_fkey` FOREIGN KEY (`invitation_id`) REFERENCES `job_invitation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match_interaction` ADD CONSTRAINT `match_interaction_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job_post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match_interaction` ADD CONSTRAINT `match_interaction_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match_interaction` ADD CONSTRAINT `match_interaction_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`profile_user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match_interaction` ADD CONSTRAINT `match_interaction_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `job_proposal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match_interaction` ADD CONSTRAINT `match_interaction_invitation_id_fkey` FOREIGN KEY (`invitation_id`) REFERENCES `job_invitation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match_interaction` ADD CONSTRAINT `match_interaction_actor_profile_id_fkey` FOREIGN KEY (`actor_profile_id`) REFERENCES `profile`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification` ADD CONSTRAINT `notification_recipient_id_fkey` FOREIGN KEY (`recipient_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification` ADD CONSTRAINT `notification_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`profile_user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_job_post_id_fkey` FOREIGN KEY (`job_post_id`) REFERENCES `job_post`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `job_proposal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_offer_id_fkey` FOREIGN KEY (`offer_id`) REFERENCES `job_offer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_closed_by_id_fkey` FOREIGN KEY (`closed_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contract_feedback` ADD CONSTRAINT `contract_feedback_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `Contract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contract_feedback` ADD CONSTRAINT `contract_feedback_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contract_feedback` ADD CONSTRAINT `contract_feedback_reviewee_id_fkey` FOREIGN KEY (`reviewee_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Milestone` ADD CONSTRAINT `Milestone_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `Contract`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Milestone` ADD CONSTRAINT `Milestone_escrow_id_fkey` FOREIGN KEY (`escrow_id`) REFERENCES `Escrow`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Milestone` ADD CONSTRAINT `Milestone_approved_submission_id_fkey` FOREIGN KEY (`approved_submission_id`) REFERENCES `milestone_submission`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `milestone_resource` ADD CONSTRAINT `milestone_resource_milestone_id_fkey` FOREIGN KEY (`milestone_id`) REFERENCES `Milestone`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `milestone_resource` ADD CONSTRAINT `milestone_resource_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `milestone_submission` ADD CONSTRAINT `milestone_submission_milestone_id_fkey` FOREIGN KEY (`milestone_id`) REFERENCES `Milestone`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `milestone_submission` ADD CONSTRAINT `milestone_submission_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `milestone_submission` ADD CONSTRAINT `milestone_submission_reviewed_by_id_fkey` FOREIGN KEY (`reviewed_by_id`) REFERENCES `client`(`profile_user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `milestone_submission_attachment` ADD CONSTRAINT `milestone_submission_attachment_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `milestone_submission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `milestone_submission_attachment` ADD CONSTRAINT `milestone_submission_attachment_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_escrow_id_fkey` FOREIGN KEY (`escrow_id`) REFERENCES `Escrow`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_payer_id_fkey` FOREIGN KEY (`payer_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_dispute_id_fkey` FOREIGN KEY (`dispute_id`) REFERENCES `Dispute`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transfer` ADD CONSTRAINT `Transfer_escrow_id_fkey` FOREIGN KEY (`escrow_id`) REFERENCES `Escrow`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Refund` ADD CONSTRAINT `Refund_escrow_id_fkey` FOREIGN KEY (`escrow_id`) REFERENCES `Escrow`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Refund` ADD CONSTRAINT `Refund_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `Payment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dispute` ADD CONSTRAINT `Dispute_escrowId_fkey` FOREIGN KEY (`escrowId`) REFERENCES `Escrow`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dispute` ADD CONSTRAINT `Dispute_latest_proposal_id_fkey` FOREIGN KEY (`latest_proposal_id`) REFERENCES `dispute_negotiation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dispute` ADD CONSTRAINT `Dispute_locked_by_id_fkey` FOREIGN KEY (`locked_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dispute` ADD CONSTRAINT `Dispute_arbitrator_id_fkey` FOREIGN KEY (`arbitrator_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dispute` ADD CONSTRAINT `Dispute_decided_by_id_fkey` FOREIGN KEY (`decided_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `arbitration_dossier` ADD CONSTRAINT `arbitration_dossier_dispute_id_fkey` FOREIGN KEY (`dispute_id`) REFERENCES `Dispute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `arbitration_dossier` ADD CONSTRAINT `arbitration_dossier_generated_by_id_fkey` FOREIGN KEY (`generated_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `arbitration_evidence_submission` ADD CONSTRAINT `arbitration_evidence_submission_dispute_id_fkey` FOREIGN KEY (`dispute_id`) REFERENCES `Dispute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `arbitration_evidence_submission` ADD CONSTRAINT `arbitration_evidence_submission_submitted_by_id_fkey` FOREIGN KEY (`submitted_by_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `arbitration_evidence_item` ADD CONSTRAINT `arbitration_evidence_item_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `arbitration_evidence_submission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `arbitration_evidence_item` ADD CONSTRAINT `arbitration_evidence_item_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `arbitration_decision_attachment` ADD CONSTRAINT `arbitration_decision_attachment_dispute_id_fkey` FOREIGN KEY (`dispute_id`) REFERENCES `Dispute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `arbitration_decision_attachment` ADD CONSTRAINT `arbitration_decision_attachment_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `asset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispute_negotiation` ADD CONSTRAINT `dispute_negotiation_dispute_id_fkey` FOREIGN KEY (`dispute_id`) REFERENCES `Dispute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispute_negotiation` ADD CONSTRAINT `dispute_negotiation_proposer_id_fkey` FOREIGN KEY (`proposer_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispute_negotiation` ADD CONSTRAINT `dispute_negotiation_counterparty_id_fkey` FOREIGN KEY (`counterparty_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispute_negotiation` ADD CONSTRAINT `dispute_negotiation_responded_by_id_fkey` FOREIGN KEY (`responded_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_thread` ADD CONSTRAINT `chat_thread_job_post_id_fkey` FOREIGN KEY (`job_post_id`) REFERENCES `job_post`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_thread` ADD CONSTRAINT `chat_thread_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `Contract`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_participant` ADD CONSTRAINT `chat_participant_thread_id_fkey` FOREIGN KEY (`thread_id`) REFERENCES `chat_thread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_participant` ADD CONSTRAINT `chat_participant_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_participant` ADD CONSTRAINT `chat_participant_last_read_message_id_fkey` FOREIGN KEY (`last_read_message_id`) REFERENCES `chat_message`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_message` ADD CONSTRAINT `chat_message_thread_id_fkey` FOREIGN KEY (`thread_id`) REFERENCES `chat_thread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_message` ADD CONSTRAINT `chat_message_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_message_attachment` ADD CONSTRAINT `chat_message_attachment_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `chat_message`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_message_attachment` ADD CONSTRAINT `chat_message_attachment_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_message_receipt` ADD CONSTRAINT `chat_message_receipt_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `chat_message`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_message_receipt` ADD CONSTRAINT `chat_message_receipt_participant_id_fkey` FOREIGN KEY (`participant_id`) REFERENCES `chat_participant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_admin_access_log` ADD CONSTRAINT `chat_admin_access_log_thread_id_fkey` FOREIGN KEY (`thread_id`) REFERENCES `chat_thread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_admin_access_log` ADD CONSTRAINT `chat_admin_access_log_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_admin_access_log` ADD CONSTRAINT `chat_admin_access_log_dispute_id_fkey` FOREIGN KEY (`dispute_id`) REFERENCES `Dispute`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentMethodRef` ADD CONSTRAINT `PaymentMethodRef_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `profile`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Specialty` ADD CONSTRAINT `Specialty_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `category_skill` ADD CONSTRAINT `category_skill_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `category_skill` ADD CONSTRAINT `category_skill_skill_id_fkey` FOREIGN KEY (`skill_id`) REFERENCES `Skill`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `specialty_skill` ADD CONSTRAINT `specialty_skill_specialty_id_fkey` FOREIGN KEY (`specialty_id`) REFERENCES `Specialty`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `specialty_skill` ADD CONSTRAINT `specialty_skill_skill_id_fkey` FOREIGN KEY (`skill_id`) REFERENCES `Skill`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_category_selection` ADD CONSTRAINT `freelancer_category_selection_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_category_selection` ADD CONSTRAINT `freelancer_category_selection_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_specialty_selection` ADD CONSTRAINT `freelancer_specialty_selection_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_specialty_selection` ADD CONSTRAINT `freelancer_specialty_selection_specialtyId_fkey` FOREIGN KEY (`specialtyId`) REFERENCES `Specialty`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_skill_selection` ADD CONSTRAINT `freelancer_skill_selection_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_skill_selection` ADD CONSTRAINT `freelancer_skill_selection_skillId_fkey` FOREIGN KEY (`skillId`) REFERENCES `Skill`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
