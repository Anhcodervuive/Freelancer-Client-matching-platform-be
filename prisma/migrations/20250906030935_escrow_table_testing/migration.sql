/*
  Warnings:

  - A unique constraint covering the columns `[stripe_customer_id]` on the table `profile` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `profile` ADD COLUMN `stripe_customer_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `profile_stripe_customer_id_key` ON `profile`(`stripe_customer_id`);
