-- AlterTable
ALTER TABLE `asset_link` MODIFY `ownerType` ENUM('USER', 'JOB', 'MESSAGE', 'PORTFOLIO') NOT NULL;

-- CreateTable
CREATE TABLE `portfolio_project` (
    `id` VARCHAR(191) NOT NULL,
    `freelancer_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `role` VARCHAR(255) NULL,
    `description` MEDIUMTEXT NULL,
    `project_url` VARCHAR(191) NULL,
    `repository_url` VARCHAR(191) NULL,
    `visibility` ENUM('PUBLIC', 'PRIVATE', 'DRAFT') NOT NULL DEFAULT 'PUBLIC',
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` VARCHAR(191) NULL,

    INDEX `portfolio_project_freelancer_id_is_deleted_idx`(`freelancer_id`, `is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `portfolio_skill` (
    `portfolio_id` VARCHAR(191) NOT NULL,
    `skill_id` VARCHAR(191) NOT NULL,
    `note` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `portfolio_skill_skill_id_idx`(`skill_id`),
    PRIMARY KEY (`portfolio_id`, `skill_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `portfolio_project` ADD CONSTRAINT `portfolio_project_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `portfolio_skill` ADD CONSTRAINT `portfolio_skill_portfolio_id_fkey` FOREIGN KEY (`portfolio_id`) REFERENCES `portfolio_project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `portfolio_skill` ADD CONSTRAINT `portfolio_skill_skill_id_fkey` FOREIGN KEY (`skill_id`) REFERENCES `Skill`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
