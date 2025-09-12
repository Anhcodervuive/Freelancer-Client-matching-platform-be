/*
  Warnings:

  - A unique constraint covering the columns `[category_id,slug]` on the table `Specialty` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `skill` ADD COLUMN `description` MEDIUMTEXT NULL;

-- AlterTable
ALTER TABLE `specialty` ADD COLUMN `description` MEDIUMTEXT NULL;

-- CreateIndex
CREATE INDEX `Category_name_slug_idx` ON `Category`(`name`, `slug`);

-- RenameIndex
ALTER TABLE `specialty` RENAME INDEX `Specialty_category_id_fkey` TO `Specialty_category_id_idx`;
