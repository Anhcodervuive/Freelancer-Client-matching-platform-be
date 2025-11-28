-- CreateTable
CREATE TABLE `job_stats` (
    `job_id` VARCHAR(191) NOT NULL,
    `views` INTEGER NOT NULL DEFAULT 0,
    `clicks` INTEGER NOT NULL DEFAULT 0,
    `saves` INTEGER NOT NULL DEFAULT 0,
    `applies` INTEGER NOT NULL DEFAULT 0,
    `chats` INTEGER NOT NULL DEFAULT 0,
    `offers` INTEGER NOT NULL DEFAULT 0,
    `accepts` INTEGER NOT NULL DEFAULT 0,
    `declines` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`job_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `freelancer_stats` (
    `freelancer_id` VARCHAR(191) NOT NULL,
    `views` INTEGER NOT NULL DEFAULT 0,
    `profile_views` INTEGER NOT NULL DEFAULT 0,
    `clicks` INTEGER NOT NULL DEFAULT 0,
    `saves` INTEGER NOT NULL DEFAULT 0,
    `invites` INTEGER NOT NULL DEFAULT 0,
    `applies` INTEGER NOT NULL DEFAULT 0,
    `chats` INTEGER NOT NULL DEFAULT 0,
    `offers` INTEGER NOT NULL DEFAULT 0,
    `accepts` INTEGER NOT NULL DEFAULT 0,
    `declines` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`freelancer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `match_feature` (
    `id` VARCHAR(191) NOT NULL,
    `job_id` VARCHAR(191) NOT NULL,
    `freelancer_id` VARCHAR(191) NOT NULL,
    `similarity_score` DOUBLE NULL,
    `budget_gap` DECIMAL(12, 2) NULL,
    `rate_gap` DECIMAL(12, 2) NULL,
    `timezone_gap_hours` INTEGER NULL,
    `level_gap` INTEGER NULL,
    `p_match` DOUBLE NULL,
    `p_freelancer_accept` DOUBLE NULL,
    `p_client_accept` DOUBLE NULL,
    `last_interaction_at` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_match_feature_job`(`job_id`),
    INDEX `idx_match_feature_freelancer`(`freelancer_id`),
    UNIQUE INDEX `match_feature_job_id_freelancer_id_key`(`job_id`, `freelancer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `job_stats` ADD CONSTRAINT `job_stats_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job_post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_stats` ADD CONSTRAINT `freelancer_stats_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match_feature` ADD CONSTRAINT `match_feature_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job_post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match_feature` ADD CONSTRAINT `match_feature_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
