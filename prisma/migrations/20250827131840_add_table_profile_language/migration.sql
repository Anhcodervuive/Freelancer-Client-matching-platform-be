/*
  Warnings:

  - You are about to drop the column `languages` on the `profile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `profile` DROP COLUMN `languages`;

-- CreateTable
CREATE TABLE `profile_language` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `languageCode` VARCHAR(10) NOT NULL,
    `proficiency` ENUM('BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_language_code`(`languageCode`),
    UNIQUE INDEX `profile_language_user_id_languageCode_key`(`user_id`, `languageCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `profile_language` ADD CONSTRAINT `profile_language_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `profile`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
