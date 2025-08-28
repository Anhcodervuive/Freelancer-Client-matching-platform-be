/*
  Warnings:

  - Added the required column `role` to the `user` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `user` ADD COLUMN `role` ENUM('CLIENT', 'FREELANCER', 'ADMIN') NOT NULL;

-- CreateTable
CREATE TABLE `freelancer` (
    `user_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NULL,
    `hourly_rate` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `education` (
    `id` VARCHAR(191) NOT NULL,
    `freelancer_id` VARCHAR(191) NOT NULL,
    `school_name` VARCHAR(255) NOT NULL,
    `degree_title` VARCHAR(255) NOT NULL,
    `field_of_study` VARCHAR(255) NULL,
    `start_year` INTEGER NULL,
    `end_year` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `education_freelancer_id_start_year_idx`(`freelancer_id`, `start_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `freelancer` ADD CONSTRAINT `freelancer_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `profile`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `education` ADD CONSTRAINT `education_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
