/*
  Warnings:

  - You are about to drop the column `rate_gap` on the `match_feature` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `match_feature` DROP COLUMN `rate_gap`,
    ADD COLUMN `freelancer_invite_accept_rate` DOUBLE NULL,
    ADD COLUMN `freelancer_region` VARCHAR(32) NULL,
    ADD COLUMN `freelancer_skill_count` INTEGER NULL,
    ADD COLUMN `freelancer_stats_accepts` INTEGER NULL,
    ADD COLUMN `freelancer_stats_applies` INTEGER NULL,
    ADD COLUMN `freelancer_stats_offers` INTEGER NULL,
    ADD COLUMN `has_past_collaboration` BOOLEAN NULL,
    ADD COLUMN `has_viewed_job` BOOLEAN NULL,
    ADD COLUMN `job_experience_level_num` INTEGER NULL,
    ADD COLUMN `job_required_skill_count` INTEGER NULL,
    ADD COLUMN `job_screening_question_count` INTEGER NULL,
    ADD COLUMN `job_stats_accepts` INTEGER NULL,
    ADD COLUMN `job_stats_applies` INTEGER NULL,
    ADD COLUMN `job_stats_offers` INTEGER NULL,
    ADD COLUMN `past_collaboration_count` INTEGER NULL,
    ADD COLUMN `skill_overlap_count` INTEGER NULL,
    ADD COLUMN `skill_overlap_ratio` DOUBLE NULL;
