/*
  Warnings:

  - A unique constraint covering the columns `[approved_submission_id]` on the table `Milestone` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `milestone` ADD COLUMN `approved_at` DATETIME(3) NULL,
    ADD COLUMN `approved_submission_id` VARCHAR(191) NULL,
    ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` VARCHAR(191) NULL,
    ADD COLUMN `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `submitted_at` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `milestone_submission` (
    `id` VARCHAR(191) NOT NULL,
    `milestone_id` VARCHAR(191) NOT NULL,
    `freelancer_id` VARCHAR(191) NOT NULL,
    `message` MEDIUMTEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `review_note` MEDIUMTEXT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX `Milestone_approved_submission_id_key` ON `Milestone`(`approved_submission_id`);

-- CreateIndex
CREATE INDEX `Milestone_approved_submission_id_idx` ON `Milestone`(`approved_submission_id`);

-- CreateIndex
CREATE INDEX `Milestone_contract_id_is_deleted_idx` ON `Milestone`(`contract_id`, `is_deleted`);

-- AddForeignKey
ALTER TABLE `Milestone` ADD CONSTRAINT `Milestone_approved_submission_id_fkey` FOREIGN KEY (`approved_submission_id`) REFERENCES `milestone_submission`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

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
