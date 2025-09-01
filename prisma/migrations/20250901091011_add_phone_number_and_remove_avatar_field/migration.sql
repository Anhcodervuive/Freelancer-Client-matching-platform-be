/*
  Warnings:

  - You are about to drop the column `avatar` on the `profile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `profile` DROP COLUMN `avatar`,
    ADD COLUMN `phone_number` VARCHAR(191) NULL;
