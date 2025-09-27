-- CreateTable
CREATE TABLE `notification` (
    `id` VARCHAR(191) NOT NULL,
    `recipient_id` VARCHAR(191) NOT NULL,
    `actor_id` VARCHAR(191) NULL,
    `category` ENUM('JOB', 'PROPOSAL', 'DISPUTE', 'SYSTEM') NOT NULL,
    `event` ENUM('JOB_INVITATION_CREATED', 'JOB_INVITATION_CANCELLED', 'JOB_INVITATION_ACCEPTED', 'JOB_INVITATION_DECLINED', 'JOB_HIRE', 'JOB_ACCEPT', 'PROPOSAL_SUBMITTED', 'DISPUTE_CREATED', 'DISPUTE_UPDATED', 'SYSTEM_MESSAGE') NOT NULL,
    `resource_type` ENUM('JOB_POST', 'JOB_INVITATION', 'JOB_PROPOSAL', 'CONTRACT', 'DISPUTE', 'SYSTEM') NULL,
    `resource_id` VARCHAR(191) NULL,
    `payload` JSON NULL,
    `status` ENUM('PENDING', 'DELIVERED', 'READ') NOT NULL DEFAULT 'PENDING',
    `read_at` DATETIME(3) NULL,
    `delivered_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_notification_recipient_status`(`recipient_id`, `status`, `created_at`),
    INDEX `idx_notification_resource`(`resource_type`, `resource_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notification` ADD CONSTRAINT `notification_recipient_id_fkey` FOREIGN KEY (`recipient_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification` ADD CONSTRAINT `notification_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
