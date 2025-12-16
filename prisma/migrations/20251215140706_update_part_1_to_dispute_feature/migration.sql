-- CreateTable
CREATE TABLE `mediation_evidence_submissions` (
    `id` VARCHAR(191) NOT NULL,
    `dispute_id` VARCHAR(191) NOT NULL,
    `submitted_by_id` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `title` VARCHAR(500) NULL,
    `description` TEXT NULL,
    `submission_deadline` DATETIME(3) NULL,
    `submitted_at` DATETIME(3) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `reviewed_by_id` VARCHAR(191) NULL,
    `review_notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `mediation_evidence_submissions_dispute_id_idx`(`dispute_id`),
    INDEX `mediation_evidence_submissions_submitted_by_id_idx`(`submitted_by_id`),
    INDEX `mediation_evidence_submissions_status_idx`(`status`),
    UNIQUE INDEX `mediation_evidence_submissions_dispute_id_submitted_by_id_key`(`dispute_id`, `submitted_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mediation_evidence_items` (
    `id` VARCHAR(191) NOT NULL,
    `submission_id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `source_type` ENUM('MILESTONE_ATTACHMENT', 'CHAT_ATTACHMENT', 'ASSET', 'EXTERNAL_URL', 'DOCUMENT_UPLOAD', 'SCREENSHOT', 'CONTRACT_DOCUMENT') NOT NULL,
    `source_id` VARCHAR(191) NULL,
    `asset_id` VARCHAR(191) NULL,
    `url` VARCHAR(2048) NULL,
    `file_name` VARCHAR(500) NULL,
    `file_size` BIGINT NULL,
    `mime_type` VARCHAR(100) NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `mediation_evidence_items_submission_id_idx`(`submission_id`),
    INDEX `mediation_evidence_items_source_type_source_id_idx`(`source_type`, `source_id`),
    INDEX `mediation_evidence_items_asset_id_idx`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mediation_evidence_comments` (
    `id` VARCHAR(191) NOT NULL,
    `submission_id` VARCHAR(191) NOT NULL,
    `item_id` VARCHAR(191) NULL,
    `author_id` VARCHAR(191) NOT NULL,
    `authorRole` ENUM('CLIENT', 'FREELANCER', 'ADMIN', 'ARBITRATOR') NOT NULL,
    `content` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `mediation_evidence_comments_submission_id_idx`(`submission_id`),
    INDEX `mediation_evidence_comments_item_id_idx`(`item_id`),
    INDEX `mediation_evidence_comments_author_id_idx`(`author_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mediation_evidence_templates` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(100) NULL,
    `required_evidence_types` JSON NULL,
    `suggested_items` JSON NULL,
    `instructions` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_id` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `mediation_evidence_templates_category_idx`(`category`),
    INDEX `mediation_evidence_templates_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mediation_proposals` (
    `id` VARCHAR(191) NOT NULL,
    `dispute_id` VARCHAR(191) NOT NULL,
    `proposed_by_id` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED_BY_ALL', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `release_amount` DECIMAL(15, 2) NOT NULL,
    `refund_amount` DECIMAL(15, 2) NOT NULL,
    `reasoning` TEXT NULL,
    `response_deadline` DATETIME(3) NOT NULL,
    `client_response` ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `freelancer_response` ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `client_responded_at` DATETIME(3) NULL,
    `freelancer_responded_at` DATETIME(3) NULL,
    `client_response_message` TEXT NULL,
    `freelancer_response_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `mediation_proposals_dispute_id_idx`(`dispute_id`),
    INDEX `mediation_proposals_proposed_by_id_idx`(`proposed_by_id`),
    INDEX `mediation_proposals_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `mediation_evidence_submissions` ADD CONSTRAINT `mediation_evidence_submissions_dispute_id_fkey` FOREIGN KEY (`dispute_id`) REFERENCES `Dispute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mediation_evidence_submissions` ADD CONSTRAINT `mediation_evidence_submissions_submitted_by_id_fkey` FOREIGN KEY (`submitted_by_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mediation_evidence_submissions` ADD CONSTRAINT `mediation_evidence_submissions_reviewed_by_id_fkey` FOREIGN KEY (`reviewed_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mediation_evidence_items` ADD CONSTRAINT `mediation_evidence_items_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `mediation_evidence_submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mediation_evidence_items` ADD CONSTRAINT `mediation_evidence_items_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mediation_evidence_comments` ADD CONSTRAINT `mediation_evidence_comments_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `mediation_evidence_submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mediation_evidence_comments` ADD CONSTRAINT `mediation_evidence_comments_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `mediation_evidence_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mediation_evidence_comments` ADD CONSTRAINT `mediation_evidence_comments_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mediation_evidence_templates` ADD CONSTRAINT `mediation_evidence_templates_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mediation_proposals` ADD CONSTRAINT `mediation_proposals_dispute_id_fkey` FOREIGN KEY (`dispute_id`) REFERENCES `Dispute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mediation_proposals` ADD CONSTRAINT `mediation_proposals_proposed_by_id_fkey` FOREIGN KEY (`proposed_by_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
