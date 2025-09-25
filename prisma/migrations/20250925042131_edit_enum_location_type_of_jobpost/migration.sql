/*
  Warnings:

  - The values [CLIENT_LOCATION_ONLY] on the enum `job_post_location_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `job_post` MODIFY `location_type` ENUM('REMOTE', 'HYBRID', 'ON_SITE') NOT NULL DEFAULT 'REMOTE';
