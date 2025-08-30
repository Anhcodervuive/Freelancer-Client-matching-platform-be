/*
  Warnings:

  - You are about to drop the column `bio` on the `profile` table. All the data in the column will be lost.
  - You are about to drop the column `links` on the `profile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `freelancer` ADD COLUMN `bio` VARCHAR(191) NULL,
    ADD COLUMN `links` JSON NULL;

-- AlterTable
ALTER TABLE `profile` DROP COLUMN `bio`,
    DROP COLUMN `links`;
