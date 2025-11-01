-- CreateTable
CREATE TABLE `user_ban` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `admin_id` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `note` MEDIUMTEXT NULL,
    `expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lifted_at` DATETIME(3) NULL,
    `lifted_by_id` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `user_ban_user_id_idx` ON `user_ban`(`user_id`);
CREATE INDEX `user_ban_admin_id_idx` ON `user_ban`(`admin_id`);
CREATE INDEX `user_ban_lifted_by_id_idx` ON `user_ban`(`lifted_by_id`);

-- AddForeignKey
ALTER TABLE `user_ban` ADD CONSTRAINT `user_ban_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `user_ban` ADD CONSTRAINT `user_ban_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `user_ban` ADD CONSTRAINT `user_ban_lifted_by_id_fkey` FOREIGN KEY (`lifted_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
