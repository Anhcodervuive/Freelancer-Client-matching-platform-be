/*
  Warnings:

  - A unique constraint covering the columns `[proposal_id]` on the table `Contract` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `contract` ADD COLUMN `job_post_id` VARCHAR(191) NULL,
    ADD COLUMN `proposal_id` VARCHAR(191) NULL;

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
    `location_type` ENUM('REMOTE', 'CLIENT_LOCATION_ONLY', 'ON_SITE') NOT NULL DEFAULT 'REMOTE',
    `preferred_locations` JSON NULL,
    `custom_terms` JSON NULL,
    `visibility` ENUM('PUBLIC', 'INVITE_ONLY', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC',
    `status` ENUM('DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED') NOT NULL DEFAULT 'DRAFT',
    `form_version` ENUM('VERSION_1', 'VERSION_2', 'VERSION_3') NOT NULL DEFAULT 'VERSION_1',
    `published_at` DATETIME(3) NULL,
    `closed_at` DATETIME(3) NULL,
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
    `actor_role` ENUM('CLIENT', 'FREELANCER', 'ADMIN') NULL,
    `action` VARCHAR(100) NOT NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `job_activity_log_job_id_created_at_idx`(`job_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Contract_proposal_id_key` ON `Contract`(`proposal_id`);

-- CreateIndex
CREATE INDEX `Contract_job_post_id_idx` ON `Contract`(`job_post_id`);

-- AddForeignKey
ALTER TABLE `job_post_attachment` ADD CONSTRAINT `job_post_attachment_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job_post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_post_attachment` ADD CONSTRAINT `job_post_attachment_asset_link_id_fkey` FOREIGN KEY (`asset_link_id`) REFERENCES `asset_link`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_post` ADD CONSTRAINT `job_post_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`profile_user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_post` ADD CONSTRAINT `job_post_specialty_id_fkey` FOREIGN KEY (`specialty_id`) REFERENCES `Specialty`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_job_post_id_fkey` FOREIGN KEY (`job_post_id`) REFERENCES `job_post`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `job_proposal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
