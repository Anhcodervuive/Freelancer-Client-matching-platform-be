-- AlterTable
ALTER TABLE `paymentmethodref` ADD COLUMN `billingCity` VARCHAR(191) NULL,
    ADD COLUMN `billingCountry` VARCHAR(191) NULL,
    ADD COLUMN `billingLine1` VARCHAR(191) NULL,
    ADD COLUMN `billingLine2` VARCHAR(191) NULL,
    ADD COLUMN `billingPostal` VARCHAR(191) NULL;
