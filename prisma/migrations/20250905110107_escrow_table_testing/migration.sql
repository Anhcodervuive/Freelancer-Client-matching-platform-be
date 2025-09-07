/*
  Warnings:

  - You are about to drop the column `billingCity` on the `paymentmethodref` table. All the data in the column will be lost.
  - You are about to drop the column `billingCountry` on the `paymentmethodref` table. All the data in the column will be lost.
  - You are about to drop the column `billingLine1` on the `paymentmethodref` table. All the data in the column will be lost.
  - You are about to drop the column `billingLine2` on the `paymentmethodref` table. All the data in the column will be lost.
  - You are about to drop the column `billingPostal` on the `paymentmethodref` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `paymentmethodref` DROP COLUMN `billingCity`,
    DROP COLUMN `billingCountry`,
    DROP COLUMN `billingLine1`,
    DROP COLUMN `billingLine2`,
    DROP COLUMN `billingPostal`,
    ADD COLUMN `billing_city` VARCHAR(191) NULL,
    ADD COLUMN `billing_country` VARCHAR(191) NULL,
    ADD COLUMN `billing_line1` VARCHAR(191) NULL,
    ADD COLUMN `billing_line2` VARCHAR(191) NULL,
    ADD COLUMN `billing_postal` VARCHAR(191) NULL;
