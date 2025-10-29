-- AlterTable
ALTER TABLE `dispute` MODIFY `arb_fee_per_party` DECIMAL(12, 2) NOT NULL DEFAULT 10;

-- AddForeignKey
ALTER TABLE `Dispute` ADD CONSTRAINT `Dispute_decided_by_id_fkey` FOREIGN KEY (`decided_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
