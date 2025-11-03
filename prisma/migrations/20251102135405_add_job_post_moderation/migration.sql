ALTER TABLE `job_post`
    ADD COLUMN `moderation_score` DOUBLE NULL,
    ADD COLUMN `moderation_category` VARCHAR(128) NULL,
    ADD COLUMN `moderation_summary` VARCHAR(255) NULL,
    ADD COLUMN `moderation_payload` JSON NULL,
    ADD COLUMN `moderation_checked_at` DATETIME(3) NULL,
    MODIFY `status` ENUM('DRAFT', 'PUBLISHED', 'PUBLISHED_PENDING_REVIEW', 'PAUSED', 'CLOSED', 'REJECTED') NOT NULL DEFAULT 'DRAFT';
