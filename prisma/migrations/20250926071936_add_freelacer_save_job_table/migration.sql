-- CreateTable
CREATE TABLE `freelancer_saved_job` (
    `freelancer_id` VARCHAR(191) NOT NULL,
    `job_post_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`freelancer_id`, `job_post_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `freelancer_saved_job` ADD CONSTRAINT `freelancer_saved_job_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_saved_job` ADD CONSTRAINT `freelancer_saved_job_job_post_id_fkey` FOREIGN KEY (`job_post_id`) REFERENCES `job_post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
