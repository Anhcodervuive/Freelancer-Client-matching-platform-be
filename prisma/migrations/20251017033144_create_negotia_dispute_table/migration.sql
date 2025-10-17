/*
  Warnings:

  - A unique constraint covering the columns `[latest_proposal_id]` on the table `Dispute` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `dispute` ADD COLUMN `latest_proposal_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `dispute_negotiation` (
    `id` VARCHAR(191) NOT NULL,
    `dispute_id` VARCHAR(191) NOT NULL,
    `proposer_id` VARCHAR(191) NOT NULL,
    `counterparty_id` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `release_amount` DECIMAL(12, 2) NOT NULL,
    `refund_amount` DECIMAL(12, 2) NOT NULL,
    `message` TEXT NULL,
    `responded_by_id` VARCHAR(191) NULL,
    `responded_at` DATETIME(3) NULL,
    `response_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `dispute_negotiation_dispute_id_idx`(`dispute_id`),
    INDEX `dispute_negotiation_proposer_id_idx`(`proposer_id`),
    INDEX `dispute_negotiation_counterparty_id_idx`(`counterparty_id`),
    INDEX `dispute_negotiation_responded_by_id_idx`(`responded_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Dispute_latest_proposal_id_key` ON `Dispute`(`latest_proposal_id`);

-- AddForeignKey
ALTER TABLE `Dispute` ADD CONSTRAINT `Dispute_latest_proposal_id_fkey` FOREIGN KEY (`latest_proposal_id`) REFERENCES `dispute_negotiation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispute_negotiation` ADD CONSTRAINT `dispute_negotiation_dispute_id_fkey` FOREIGN KEY (`dispute_id`) REFERENCES `Dispute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispute_negotiation` ADD CONSTRAINT `dispute_negotiation_proposer_id_fkey` FOREIGN KEY (`proposer_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispute_negotiation` ADD CONSTRAINT `dispute_negotiation_counterparty_id_fkey` FOREIGN KEY (`counterparty_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispute_negotiation` ADD CONSTRAINT `dispute_negotiation_responded_by_id_fkey` FOREIGN KEY (`responded_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
