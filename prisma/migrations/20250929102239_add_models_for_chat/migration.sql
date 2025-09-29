-- CreateTable
CREATE TABLE `chat_thread` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('PROJECT', 'ADMIN_CLIENT', 'ADMIN_FREELANCER') NOT NULL,
    `job_post_id` VARCHAR(191) NULL,
    `contract_id` VARCHAR(191) NULL,
    `subject` VARCHAR(255) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `chat_thread_type_job_post_id_idx`(`type`, `job_post_id`),
    INDEX `chat_thread_type_contract_id_idx`(`type`, `contract_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_participant` (
    `id` VARCHAR(191) NOT NULL,
    `thread_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `role` ENUM('CLIENT', 'FREELANCER', 'ADMIN') NOT NULL,
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `left_at` DATETIME(3) NULL,
    `last_read_message_id` VARCHAR(191) NULL,
    `last_read_at` DATETIME(3) NULL,
    `is_muted` BOOLEAN NOT NULL DEFAULT false,
    `metadata` JSON NULL,

    INDEX `chat_participant_user_id_idx`(`user_id`),
    UNIQUE INDEX `chat_participant_thread_id_user_id_key`(`thread_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_message` (
    `id` VARCHAR(191) NOT NULL,
    `thread_id` VARCHAR(191) NOT NULL,
    `sender_id` VARCHAR(191) NULL,
    `sender_role` ENUM('CLIENT', 'FREELANCER', 'ADMIN') NULL,
    `type` ENUM('USER', 'SYSTEM') NOT NULL DEFAULT 'USER',
    `body` TEXT NULL,
    `rich_payload` JSON NULL,
    `sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `edited_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_message_thread_id_sent_at_idx`(`thread_id`, `sent_at`),
    INDEX `chat_message_sender_id_idx`(`sender_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_message_attachment` (
    `id` VARCHAR(191) NOT NULL,
    `message_id` VARCHAR(191) NOT NULL,
    `asset_id` VARCHAR(191) NULL,
    `url` VARCHAR(2048) NULL,
    `name` VARCHAR(255) NULL,
    `mime_type` VARCHAR(255) NULL,
    `size_bytes` INTEGER NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_message_attachment_message_id_idx`(`message_id`),
    INDEX `chat_message_attachment_asset_id_idx`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_message_receipt` (
    `id` VARCHAR(191) NOT NULL,
    `message_id` VARCHAR(191) NOT NULL,
    `participant_id` VARCHAR(191) NOT NULL,
    `delivered_at` DATETIME(3) NULL,
    `read_at` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_message_receipt_participant_id_read_at_idx`(`participant_id`, `read_at`),
    UNIQUE INDEX `chat_message_receipt_message_id_participant_id_key`(`message_id`, `participant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_admin_access_log` (
    `id` VARCHAR(191) NOT NULL,
    `thread_id` VARCHAR(191) NOT NULL,
    `admin_id` VARCHAR(191) NOT NULL,
    `dispute_id` VARCHAR(191) NULL,
    `action` ENUM('VIEW_THREAD', 'EXPORT_TRANSCRIPT', 'DOWNLOAD_ATTACHMENT') NOT NULL DEFAULT 'VIEW_THREAD',
    `reason` VARCHAR(255) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_admin_access_log_admin_id_created_at_idx`(`admin_id`, `created_at`),
    INDEX `chat_admin_access_log_dispute_id_idx`(`dispute_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `chat_thread` ADD CONSTRAINT `chat_thread_job_post_id_fkey` FOREIGN KEY (`job_post_id`) REFERENCES `job_post`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_thread` ADD CONSTRAINT `chat_thread_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `Contract`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_participant` ADD CONSTRAINT `chat_participant_thread_id_fkey` FOREIGN KEY (`thread_id`) REFERENCES `chat_thread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_participant` ADD CONSTRAINT `chat_participant_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_participant` ADD CONSTRAINT `chat_participant_last_read_message_id_fkey` FOREIGN KEY (`last_read_message_id`) REFERENCES `chat_message`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_message` ADD CONSTRAINT `chat_message_thread_id_fkey` FOREIGN KEY (`thread_id`) REFERENCES `chat_thread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_message` ADD CONSTRAINT `chat_message_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_message_attachment` ADD CONSTRAINT `chat_message_attachment_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `chat_message`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_message_attachment` ADD CONSTRAINT `chat_message_attachment_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_message_receipt` ADD CONSTRAINT `chat_message_receipt_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `chat_message`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_message_receipt` ADD CONSTRAINT `chat_message_receipt_participant_id_fkey` FOREIGN KEY (`participant_id`) REFERENCES `chat_participant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_admin_access_log` ADD CONSTRAINT `chat_admin_access_log_thread_id_fkey` FOREIGN KEY (`thread_id`) REFERENCES `chat_thread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_admin_access_log` ADD CONSTRAINT `chat_admin_access_log_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_admin_access_log` ADD CONSTRAINT `chat_admin_access_log_dispute_id_fkey` FOREIGN KEY (`dispute_id`) REFERENCES `Dispute`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
