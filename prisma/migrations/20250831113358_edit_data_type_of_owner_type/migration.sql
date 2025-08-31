/*
  Warnings:

  - You are about to alter the column `ownerType` on the `asset_link` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(7))`.
  - You are about to alter the column `ownerId` on the `asset_link` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(1))` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `asset_link` MODIFY `ownerType` ENUM('USER', 'JOB', 'MESSAGE') NOT NULL,
    MODIFY `ownerId` VARCHAR(191) NOT NULL;
