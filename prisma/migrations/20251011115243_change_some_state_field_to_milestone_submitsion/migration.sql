/*
  Warnings:

  - The values [REQUIRES_PAYMENT,SUCCEEDED_REFUNDED] on the enum `Payment_status` will be removed. If these variants are still used in the database, this will fail.
  - The values [PENDING_SUCCEEDED] on the enum `Refund_status` will be removed. If these variants are still used in the database, this will fail.
  - The values [PENDING_SUCCEEDED,FAILED_REVERSED] on the enum `Transfer_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `milestone` ADD COLUMN `released_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `milestone_submission` ADD COLUMN `review_rating` TINYINT UNSIGNED NULL;

-- AlterTable
ALTER TABLE `payment` MODIFY `status` ENUM('REQUIRES_ACTION', 'SUCCEEDED', 'REFUNDED', 'FAILED') NOT NULL;

-- AlterTable
ALTER TABLE `refund` MODIFY `status` ENUM('PENDING', 'SUCCEEDED', 'FAILED') NOT NULL;

-- AlterTable
ALTER TABLE `transfer` MODIFY `status` ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'REVERSED') NOT NULL;
