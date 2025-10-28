-- AlterTable
ALTER TABLE `chat_message` MODIFY `sender_role` ENUM('CLIENT', 'FREELANCER', 'ADMIN', 'ARBITRATOR') NULL;

-- AlterTable
ALTER TABLE `chat_participant` MODIFY `role` ENUM('CLIENT', 'FREELANCER', 'ADMIN', 'ARBITRATOR') NOT NULL;

-- AlterTable
ALTER TABLE `dispute` ADD COLUMN `arbitrator_assigned_at` DATETIME(3) NULL,
    ADD COLUMN `arbitrator_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `job_activity_log` MODIFY `actor_role` ENUM('CLIENT', 'FREELANCER', 'ADMIN', 'ARBITRATOR') NULL;

-- AlterTable
ALTER TABLE `match_interaction` MODIFY `actor_role` ENUM('CLIENT', 'FREELANCER', 'ADMIN', 'ARBITRATOR') NULL;

-- AlterTable
ALTER TABLE `payment` MODIFY `payer_role` ENUM('CLIENT', 'FREELANCER', 'ADMIN', 'ARBITRATOR') NULL;

-- AlterTable
ALTER TABLE `user` MODIFY `role` ENUM('CLIENT', 'FREELANCER', 'ADMIN', 'ARBITRATOR') NULL;

-- CreateIndex
CREATE INDEX `idx_dispute_arbitrator` ON `Dispute`(`arbitrator_id`);

-- AddForeignKey
ALTER TABLE `Dispute` ADD CONSTRAINT `Dispute_arbitrator_id_fkey` FOREIGN KEY (`arbitrator_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
