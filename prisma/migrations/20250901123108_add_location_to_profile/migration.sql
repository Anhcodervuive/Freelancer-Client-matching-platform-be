/*
  Warnings:

  - You are about to drop the column `province` on the `profile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `profile` DROP COLUMN `province`,
    ADD COLUMN `district` VARCHAR(191) NULL;
