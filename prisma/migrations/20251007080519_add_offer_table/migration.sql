/*
  Warnings:

  - A unique constraint covering the columns `[offer_id]` on the table `Contract` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `contract` ADD COLUMN `offer_id` VARCHAR(191) NULL;

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
    `expire_at` DATETIME(3) NULL,
    `status` ENUM('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
    `sent_at` DATETIME(3) NULL,
    `responded_at` DATETIME(3) NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX `Contract_offer_id_key` ON `Contract`(`offer_id`);

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
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_offer_id_fkey` FOREIGN KEY (`offer_id`) REFERENCES `job_offer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
