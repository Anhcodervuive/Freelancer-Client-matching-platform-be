-- AlterTable
ALTER TABLE `notification` ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` VARCHAR(191) NULL,
    ADD COLUMN `is_deleted` BOOLEAN NOT NULL DEFAULT false;
