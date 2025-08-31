/*
  Warnings:

  - You are about to alter the column `ownerId` on the `asset_link` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(7))`.

*/
-- AlterTable
ALTER TABLE `asset_link` MODIFY `ownerId` ENUM('USER', 'JOB', 'MESSAGE') NOT NULL;
