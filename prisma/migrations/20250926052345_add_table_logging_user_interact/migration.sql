-- CreateTable
CREATE TABLE `match_interaction` (
    `id` VARCHAR(191) NOT NULL,
    `job_id` VARCHAR(191) NULL,
    `freelancer_id` VARCHAR(191) NULL,
    `client_id` VARCHAR(191) NULL,
    `proposal_id` VARCHAR(191) NULL,
    `invitation_id` VARCHAR(191) NULL,
    `actor_profile_id` VARCHAR(191) NULL,
    `actor_role` ENUM('CLIENT', 'FREELANCER', 'ADMIN') NULL,
    `type` ENUM('JOB_VIEW', 'PROFILE_VIEW', 'PROPOSAL_SUBMITTED', 'PROPOSAL_SHORTLISTED', 'PROPOSAL_INTERVIEWING', 'PROPOSAL_HIRED', 'INVITATION_SENT', 'INVITATION_ACCEPTED') NOT NULL,
    `source` ENUM('DIRECT', 'SEARCH', 'RECOMMENDATION', 'SYSTEM') NOT NULL DEFAULT 'DIRECT',
    `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_match_interaction_job`(`job_id`, `occurred_at`),
    INDEX `idx_match_interaction_freelancer`(`freelancer_id`, `occurred_at`),
    INDEX `idx_match_interaction_client`(`client_id`, `occurred_at`),
    INDEX `idx_match_interaction_type`(`type`, `occurred_at`),
    INDEX `idx_match_interaction_actor`(`actor_profile_id`, `occurred_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `match_interaction` ADD CONSTRAINT `match_interaction_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job_post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match_interaction` ADD CONSTRAINT `match_interaction_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match_interaction` ADD CONSTRAINT `match_interaction_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`profile_user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match_interaction` ADD CONSTRAINT `match_interaction_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `job_proposal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match_interaction` ADD CONSTRAINT `match_interaction_invitation_id_fkey` FOREIGN KEY (`invitation_id`) REFERENCES `job_invitation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match_interaction` ADD CONSTRAINT `match_interaction_actor_profile_id_fkey` FOREIGN KEY (`actor_profile_id`) REFERENCES `profile`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;
