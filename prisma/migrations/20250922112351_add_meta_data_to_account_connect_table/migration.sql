-- AlterTable
ALTER TABLE `freelancer_connect_account` ADD COLUMN `country` VARCHAR(191) NULL,
    ADD COLUMN `default_currency` VARCHAR(191) NULL,
    ADD COLUMN `external_account_summary` JSON NULL;
