/*
  Warnings:

  - You are about to drop the `profile_language` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `profile_language` DROP FOREIGN KEY `profile_language_user_id_fkey`;

-- DropTable
DROP TABLE `profile_language`;

-- CreateTable
CREATE TABLE `freelancer_language` (
    `freelancer_id` VARCHAR(191) NOT NULL,
    `languageCode` VARCHAR(10) NOT NULL,
    `proficiency` ENUM('BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_language_code`(`languageCode`),
    PRIMARY KEY (`freelancer_id`, `languageCode`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `freelancer_language` ADD CONSTRAINT `freelancer_language_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
