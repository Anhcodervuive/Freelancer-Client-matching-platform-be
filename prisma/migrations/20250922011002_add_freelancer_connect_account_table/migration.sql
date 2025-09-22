-- CreateTable
CREATE TABLE `freelancer_connect_account` (
    `freelancer_id` VARCHAR(191) NOT NULL,
    `stripe_account_id` VARCHAR(191) NOT NULL,
    `account_type` ENUM('EXPRESS', 'STANDARD', 'CUSTOM') NOT NULL DEFAULT 'EXPRESS',
    `details_submitted` BOOLEAN NOT NULL DEFAULT false,
    `payouts_enabled` BOOLEAN NOT NULL DEFAULT false,
    `charges_enabled` BOOLEAN NOT NULL DEFAULT false,
    `requirements_due` JSON NULL,
    `requirements_currently_due` JSON NULL,
    `requirements_past_due` JSON NULL,
    `disabled_reason` VARCHAR(191) NULL,
    `disabled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `freelancer_connect_account_stripe_account_id_key`(`stripe_account_id`),
    PRIMARY KEY (`freelancer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `freelancer_connect_account` ADD CONSTRAINT `freelancer_connect_account_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
