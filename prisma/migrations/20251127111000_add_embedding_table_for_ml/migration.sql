-- CreateTable
CREATE TABLE `embedding` (
    `id` VARCHAR(191) NOT NULL,
    `entity_type` ENUM('JOB', 'FREELANCER') NOT NULL,
    `entity_id` VARCHAR(191) NOT NULL,
    `kind` ENUM('FULL', 'SKILLS', 'DOMAIN') NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `version` VARCHAR(100) NULL,
    `vector` JSON NOT NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_embedding_entity`(`entity_type`, `entity_id`),
    UNIQUE INDEX `embedding_entity_type_entity_id_kind_model_key`(`entity_type`, `entity_id`, `kind`, `model`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
