-- AlterTable
ALTER TABLE `Contract`
    ADD COLUMN `closure_type` ENUM('COMPLETED', 'CANCELLED', 'AUTO_RELEASED') NULL,
    ADD COLUMN `closure_reason` MEDIUMTEXT NULL,
    ADD COLUMN `ended_at` DATETIME(3) NULL,
    ADD COLUMN `closed_by_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Contract_closed_by_id_idx` ON `Contract`(`closed_by_id`);

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_closed_by_id_fkey` FOREIGN KEY (`closed_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE `contract_feedback` (
    `id` VARCHAR(191) NOT NULL,
    `contract_id` VARCHAR(191) NOT NULL,
    `reviewer_id` VARCHAR(191) NOT NULL,
    `reviewee_id` VARCHAR(191) NOT NULL,
    `role` ENUM('CLIENT', 'FREELANCER', 'SYSTEM') NOT NULL,
    `rating` TINYINT UNSIGNED NOT NULL,
    `comment` MEDIUMTEXT NULL,
    `would_hire_again` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `contract_feedback_contract_id_reviewer_id_key`(`contract_id`, `reviewer_id`),
    INDEX `contract_feedback_reviewee_id_idx`(`reviewee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `contract_feedback` ADD CONSTRAINT `contract_feedback_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `Contract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contract_feedback` ADD CONSTRAINT `contract_feedback_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contract_feedback` ADD CONSTRAINT `contract_feedback_reviewee_id_fkey` FOREIGN KEY (`reviewee_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
