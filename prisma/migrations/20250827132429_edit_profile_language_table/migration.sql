/*
  Warnings:

  - The primary key for the `profile_language` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `profile_language` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `profile_language` DROP FOREIGN KEY `profile_language_user_id_fkey`;

-- DropIndex
DROP INDEX `profile_language_user_id_languageCode_key` ON `profile_language`;

-- AlterTable
ALTER TABLE `profile_language` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD PRIMARY KEY (`user_id`, `languageCode`);

-- AddForeignKey
ALTER TABLE `profile_language` ADD CONSTRAINT `profile_language_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `profile`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
