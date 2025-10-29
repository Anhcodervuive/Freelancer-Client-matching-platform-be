ALTER TABLE `dispute`
    ADD COLUMN `decided_at` DATETIME(3) NULL,
    ADD COLUMN `decision_summary` TEXT NULL,
    ADD COLUMN `decision_reasoning` TEXT NULL;

CREATE TABLE `arbitration_decision_attachment` (
    `id` VARCHAR(191) NOT NULL,
    `dispute_id` VARCHAR(191) NOT NULL,
    `asset_id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_arbitration_decision_attachment_dispute` (`dispute_id`),
    INDEX `idx_arbitration_decision_attachment_asset` (`asset_id`),
    CONSTRAINT `arbitration_decision_attachment_dispute_id_fkey` FOREIGN KEY (`dispute_id`) REFERENCES `dispute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `arbitration_decision_attachment_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `asset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
