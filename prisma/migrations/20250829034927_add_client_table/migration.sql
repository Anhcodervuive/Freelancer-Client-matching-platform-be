-- CreateTable
CREATE TABLE `client` (
    `profile_user_id` VARCHAR(191) NOT NULL,
    `company_name` VARCHAR(191) NOT NULL,
    `website_url` VARCHAR(191) NULL,
    `size` ENUM('JUST_ME', 'TWO_TO_NINE', 'TEN_TO_NINETY', 'HUNDRED_TO_K', 'MORE_THAN_K') NOT NULL,
    `description` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`profile_user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `client` ADD CONSTRAINT `client_profile_user_id_fkey` FOREIGN KEY (`profile_user_id`) REFERENCES `profile`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
