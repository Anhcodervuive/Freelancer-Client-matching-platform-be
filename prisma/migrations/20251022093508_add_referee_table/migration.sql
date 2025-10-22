-- AlterTable
ALTER TABLE `dispute` ADD COLUMN `current_dossier_version` INTEGER NULL,
    ADD COLUMN `locked_at` DATETIME(3) NULL,
    ADD COLUMN `locked_by_id` VARCHAR(191) NULL,
    MODIFY `status` ENUM('OPEN', 'NEGOTIATION', 'INTERNAL_MEDIATION', 'AWAITING_ARBITRATION_FEES', 'ARBITRATION_READY', 'ARBITRATION', 'RESOLVED_RELEASE_ALL', 'RESOLVED_REFUND_ALL', 'RESOLVED_SPLIT', 'CANCELED', 'EXPIRED') NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE `payment` ADD COLUMN `dispute_id` VARCHAR(191) NULL,
    ADD COLUMN `payer_id` VARCHAR(191) NULL,
    ADD COLUMN `payer_role` ENUM('CLIENT', 'FREELANCER', 'ADMIN') NULL,
    MODIFY `type` ENUM('ESCROW_MILESTONE', 'PLATFORM_SERVICE', 'ARBITRATION_FEE') NOT NULL DEFAULT 'ESCROW_MILESTONE';

-- CreateTable
CREATE TABLE `arbitration_dossier` (
    `id` VARCHAR(191) NOT NULL,
    `dispute_id` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('DRAFT', 'LOCKED', 'FINALIZED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `generated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `generated_by_id` VARCHAR(191) NULL,
    `locked_at` DATETIME(3) NULL,
    `finalized_at` DATETIME(3) NULL,
    `hash` VARCHAR(191) NULL,
    `payload` JSON NOT NULL,
    `pdf_url` VARCHAR(191) NULL,
    `notes` TEXT NULL,

    INDEX `idx_arbitration_dossier_dispute`(`dispute_id`),
    UNIQUE INDEX `arbitration_dossier_dispute_id_version_key`(`dispute_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Payment_dispute_id_idx` ON `Payment`(`dispute_id`);

-- CreateIndex
CREATE INDEX `Payment_payer_id_idx` ON `Payment`(`payer_id`);

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_payer_id_fkey` FOREIGN KEY (`payer_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_dispute_id_fkey` FOREIGN KEY (`dispute_id`) REFERENCES `Dispute`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dispute` ADD CONSTRAINT `Dispute_locked_by_id_fkey` FOREIGN KEY (`locked_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `arbitration_dossier` ADD CONSTRAINT `arbitration_dossier_dispute_id_fkey` FOREIGN KEY (`dispute_id`) REFERENCES `Dispute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `arbitration_dossier` ADD CONSTRAINT `arbitration_dossier_generated_by_id_fkey` FOREIGN KEY (`generated_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
