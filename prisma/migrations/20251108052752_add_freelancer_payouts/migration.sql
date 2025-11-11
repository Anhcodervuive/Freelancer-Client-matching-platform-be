/*
  Warnings:

  - You are about to alter the column `reason` on the `user_ban` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `user_ban` MODIFY `reason` VARCHAR(191) NOT NULL,
    MODIFY `note` TEXT NULL;

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

-- AddForeignKey
ALTER TABLE `freelancer_payout` ADD CONSTRAINT `freelancer_payout_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_payout_transfer` ADD CONSTRAINT `freelancer_payout_transfer_payout_id_fkey` FOREIGN KEY (`payout_id`) REFERENCES `freelancer_payout`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_payout_transfer` ADD CONSTRAINT `freelancer_payout_transfer_transfer_id_fkey` FOREIGN KEY (`transfer_id`) REFERENCES `Transfer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
