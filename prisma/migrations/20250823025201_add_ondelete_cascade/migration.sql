-- DropForeignKey
ALTER TABLE `email_verify_token` DROP FOREIGN KEY `email_verify_token_userId_fkey`;

-- DropIndex
DROP INDEX `email_verify_token_userId_fkey` ON `email_verify_token`;

-- AddForeignKey
ALTER TABLE `email_verify_token` ADD CONSTRAINT `email_verify_token_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
