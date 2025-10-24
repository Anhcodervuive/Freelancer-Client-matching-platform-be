-- CreateTable
CREATE TABLE `arbitration_evidence_submission` (
    `id` VARCHAR(191) NOT NULL,
    `dispute_id` VARCHAR(191) NOT NULL,
    `submitted_by_id` VARCHAR(191) NOT NULL,
    `statement` TEXT NULL,
    `no_additional_evidence` BOOLEAN NOT NULL DEFAULT false,
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `arbitration_evidence_submission_dispute_id_idx`(`dispute_id`),
    UNIQUE INDEX `arbitration_evidence_submission_dispute_id_submitted_by_id_key`(`dispute_id`, `submitted_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `arbitration_evidence_item` (
    `id` VARCHAR(191) NOT NULL,
    `submission_id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `source_type` ENUM('MILESTONE_ATTACHMENT', 'CHAT_ATTACHMENT', 'ASSET', 'EXTERNAL_URL') NOT NULL,
    `source_id` VARCHAR(191) NULL,
    `url` VARCHAR(2048) NULL,
    `asset_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `arbitration_evidence_item_submission_id_idx`(`submission_id`),
    INDEX `arbitration_evidence_item_asset_id_idx`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `arbitration_evidence_submission` ADD CONSTRAINT `arbitration_evidence_submission_dispute_id_fkey` FOREIGN KEY (`dispute_id`) REFERENCES `Dispute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `arbitration_evidence_submission` ADD CONSTRAINT `arbitration_evidence_submission_submitted_by_id_fkey` FOREIGN KEY (`submitted_by_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `arbitration_evidence_item` ADD CONSTRAINT `arbitration_evidence_item_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `arbitration_evidence_submission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `arbitration_evidence_item` ADD CONSTRAINT `arbitration_evidence_item_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
