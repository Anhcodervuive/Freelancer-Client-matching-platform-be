-- CreateTable
CREATE TABLE `user` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `google_id` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `email_verified_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `role` ENUM('CLIENT', 'FREELANCER', 'ADMIN') NOT NULL,

    UNIQUE INDEX `user_email_key`(`email`),
    UNIQUE INDEX `user_google_id_key`(`google_id`),
    INDEX `user_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profile` (
    `user_id` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NULL,
    `last_name` VARCHAR(191) NULL,
    `phone_number` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `stripe_customer_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `profile_stripe_customer_id_key`(`stripe_customer_id`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_verify_token` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `email_verify_token_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `freelancer_language` (
    `freelancer_id` VARCHAR(191) NOT NULL,
    `languageCode` VARCHAR(10) NOT NULL,
    `proficiency` ENUM('BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_language_code`(`languageCode`),
    PRIMARY KEY (`freelancer_id`, `languageCode`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `freelancer` (
    `user_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NULL,
    `bio` MEDIUMTEXT NULL,
    `links` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `education` (
    `id` VARCHAR(191) NOT NULL,
    `freelancer_id` VARCHAR(191) NOT NULL,
    `school_name` VARCHAR(255) NOT NULL,
    `degree_title` VARCHAR(255) NOT NULL,
    `field_of_study` VARCHAR(255) NULL,
    `start_year` INTEGER NULL,
    `end_year` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `education_freelancer_id_start_year_idx`(`freelancer_id`, `start_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client` (
    `profile_user_id` VARCHAR(191) NOT NULL,
    `company_name` VARCHAR(191) NOT NULL,
    `website_url` VARCHAR(191) NULL,
    `size` ENUM('JUST_ME', 'TWO_TO_NINE', 'TEN_TO_NINETY', 'HUNDRED_TO_K', 'MORE_THAN_K') NOT NULL,
    `description` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`profile_user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset` (
    `id` VARCHAR(191) NOT NULL,
    `provider` ENUM('CLOUDINARY', 'S3', 'GCS', 'R2', 'MINIO') NULL,
    `kind` ENUM('IMAGE', 'VIDEO', 'FILE') NOT NULL,
    `public_id` VARCHAR(191) NULL,
    `bucket` VARCHAR(191) NULL,
    `storageKey` VARCHAR(191) NULL,
    `url` VARCHAR(191) NULL,
    `mimeType` VARCHAR(191) NULL,
    `bytes` INTEGER NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `checksum_sha256` VARCHAR(191) NULL,
    `visibility` ENUM('PUBLIC', 'PRIVATE', 'AUTHENTICATED') NOT NULL DEFAULT 'PUBLIC',
    `status` ENUM('PENDING', 'READY', 'INFECTED', 'DELETED') NOT NULL DEFAULT 'PENDING',
    `createdBy` VARCHAR(191) NULL,
    `meta` JSON NULL,
    `parentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `asset_public_id_key`(`public_id`),
    UNIQUE INDEX `asset_storageKey_key`(`storageKey`),
    INDEX `asset_provider_bucket_storageKey_idx`(`provider`, `bucket`, `storageKey`),
    INDEX `asset_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_link` (
    `id` VARCHAR(191) NOT NULL,
    `ownerType` ENUM('USER', 'JOB', 'MESSAGE') NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `role` ENUM('AVATAR', 'COVER', 'GALLERY', 'ATTACHMENT', 'BANNER', 'OTHER') NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `label` VARCHAR(191) NULL,
    `caption` VARCHAR(191) NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `createdBy` VARCHAR(191) NULL,
    `assetId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `asset_link_ownerType_ownerId_role_idx`(`ownerType`, `ownerId`, `role`),
    UNIQUE INDEX `asset_link_ownerType_ownerId_role_position_key`(`ownerType`, `ownerId`, `role`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Contract` (
    `id` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `freelancer_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Milestone` (
    `id` VARCHAR(191) NOT NULL,
    `contract_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `status` ENUM('OPEN', 'SUBMITTED', 'APPROVED', 'RELEASED', 'CANCELED') NOT NULL DEFAULT 'OPEN',
    `escrow_id` VARCHAR(191) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Milestone_escrow_id_key`(`escrow_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Escrow` (
    `id` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `amount_funded` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `amount_released` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `amount_refunded` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `status` ENUM('UNFUNDED', 'FUNDED', 'PARTIALLY_RELEASED', 'RELEASED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'DISPUTED') NOT NULL DEFAULT 'UNFUNDED',
    `flatform_fee_total` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `processing_fee_total` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `tax_with_holding_total` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `escrow_id` VARCHAR(191) NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `status` ENUM('REQUIRES_PAYMENT', 'SUCCEEDED_REFUNDED', 'FAILED') NOT NULL,
    `payment_intent_id` VARCHAR(191) NOT NULL,
    `charge_id` VARCHAR(191) NULL,
    `cardBrand` VARCHAR(191) NULL,
    `cardLast4` CHAR(4) NULL,
    `cardExpMonth` TINYINT UNSIGNED NULL,
    `cardExpYear` SMALLINT UNSIGNED NULL,
    `cardFingerprint` CHAR(32) NULL,
    `idem_key` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Payment_payment_intent_id_key`(`payment_intent_id`),
    UNIQUE INDEX `Payment_idem_key_key`(`idem_key`),
    INDEX `Payment_escrow_id_idx`(`escrow_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transfer` (
    `id` VARCHAR(191) NOT NULL,
    `escrow_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING_SUCCEEDED', 'FAILED_REVERSED') NOT NULL,
    `tranfer_id` VARCHAR(191) NULL,
    `destination_account_id` VARCHAR(191) NOT NULL,
    `idem_key` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Transfer_tranfer_id_key`(`tranfer_id`),
    UNIQUE INDEX `Transfer_idem_key_key`(`idem_key`),
    INDEX `Transfer_escrow_id_idx`(`escrow_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Refund` (
    `id` VARCHAR(191) NOT NULL,
    `escrow_id` VARCHAR(191) NOT NULL,
    `payment_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING_SUCCEEDED', 'FAILED') NOT NULL,
    `stripe_refund_id` VARCHAR(191) NULL,
    `idem_key` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Refund_stripe_refund_id_key`(`stripe_refund_id`),
    UNIQUE INDEX `Refund_idem_key_key`(`idem_key`),
    INDEX `Refund_escrow_id_idx`(`escrow_id`),
    INDEX `Refund_payment_id_idx`(`payment_id`),
    UNIQUE INDEX `Refund_payment_id_key`(`payment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Dispute` (
    `id` VARCHAR(191) NOT NULL,
    `escrowId` VARCHAR(191) NOT NULL,
    `openedById` VARCHAR(191) NOT NULL,
    `status` ENUM('OPEN', 'NEGOTIATION', 'AWAITING_ARBITRATION_FEES', 'ARBITRATION', 'RESOLVED_RELEASE_ALL', 'RESOLVED_REFUND_ALL', 'RESOLVED_SPLIT', 'CANCELED', 'EXPIRED') NOT NULL DEFAULT 'OPEN',
    `proposed_release` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `proposed_refund` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `arb_fee_per_party` DECIMAL(12, 2) NOT NULL DEFAULT 20,
    `client_arb_fee_paid` BOOLEAN NOT NULL DEFAULT false,
    `freelancer_arb_fee_paid` BOOLEAN NOT NULL DEFAULT false,
    `response_deadline` DATETIME(3) NULL,
    `arbitration_deadline` DATETIME(3) NULL,
    `decided_release` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `decided_refund` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `decided_by_id` VARCHAR(191) NULL,
    `note` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Dispute_escrowId_key`(`escrowId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentMethodRef` (
    `id` VARCHAR(191) NOT NULL,
    `profile_id` VARCHAR(191) NOT NULL,
    `stripe_customer_id` VARCHAR(191) NOT NULL,
    `payment_method_id` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `last_name` VARCHAR(191) NOT NULL,
    `brand` VARCHAR(191) NULL,
    `last4` VARCHAR(191) NULL,
    `exp_month` INTEGER NULL,
    `exp_year` INTEGER NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `billing_country` VARCHAR(191) NULL,
    `billing_city` VARCHAR(191) NULL,
    `billing_line1` VARCHAR(191) NULL,
    `billing_line2` VARCHAR(191) NULL,
    `billing_postal` VARCHAR(191) NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` VARCHAR(191) NULL,

    INDEX `PaymentMethodRef_profile_id_idx`(`profile_id`),
    UNIQUE INDEX `PaymentMethodRef_stripe_customer_id_payment_method_id_key`(`stripe_customer_id`, `payment_method_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WebhookEventLog` (
    `id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `raw` JSON NOT NULL,
    `processed` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `WebhookEventLog_event_id_key`(`event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` VARCHAR(191) NULL,

    UNIQUE INDEX `Category_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Specialty` (
    `id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` VARCHAR(191) NULL,

    UNIQUE INDEX `Specialty_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Skill` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` VARCHAR(191) NULL,

    UNIQUE INDEX `Skill_slug_key`(`slug`),
    INDEX `Skill_name_is_deleted_idx`(`name`, `is_deleted`),
    INDEX `Skill_slug_is_deleted_idx`(`slug`, `is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `category_skill` (
    `category_id` VARCHAR(191) NOT NULL,
    `skill_id` VARCHAR(191) NOT NULL,
    `weight` INTEGER NOT NULL DEFAULT 50,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` VARCHAR(191) NULL,

    INDEX `category_skill_skill_id_idx`(`skill_id`),
    PRIMARY KEY (`category_id`, `skill_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `specialty_skill` (
    `specialty_id` VARCHAR(191) NOT NULL,
    `skill_id` VARCHAR(191) NOT NULL,
    `weight` INTEGER NOT NULL DEFAULT 70,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` VARCHAR(191) NULL,

    INDEX `specialty_skill_skill_id_idx`(`skill_id`),
    PRIMARY KEY (`specialty_id`, `skill_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `freelancer_category_selection` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `profile_id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NOT NULL,
    `picked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` VARCHAR(191) NULL,

    INDEX `freelancer_category_selection_category_id_is_deleted_idx`(`category_id`, `is_deleted`),
    INDEX `freelancer_category_selection_profile_id_is_deleted_picked_a_idx`(`profile_id`, `is_deleted`, `picked_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `freelancer_specialty_selection` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `specialtyId` VARCHAR(191) NOT NULL,
    `pickedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deletedAt` DATETIME(3) NULL,
    `deletedBy` VARCHAR(191) NULL,

    INDEX `freelancer_specialty_selection_userId_is_deleted_idx`(`userId`, `is_deleted`),
    INDEX `freelancer_specialty_selection_specialtyId_is_deleted_idx`(`specialtyId`, `is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `freelancer_skill_selection` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `skillId` VARCHAR(191) NOT NULL,
    `orderHint` INTEGER NULL,
    `pickedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deletedAt` DATETIME(3) NULL,
    `deletedBy` VARCHAR(191) NULL,

    INDEX `freelancer_skill_selection_userId_is_deleted_idx`(`userId`, `is_deleted`),
    INDEX `freelancer_skill_selection_skillId_is_deleted_idx`(`skillId`, `is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `profile` ADD CONSTRAINT `profile_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_verify_token` ADD CONSTRAINT `email_verify_token_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_language` ADD CONSTRAINT `freelancer_language_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer` ADD CONSTRAINT `freelancer_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `profile`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `education` ADD CONSTRAINT `education_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client` ADD CONSTRAINT `client_profile_user_id_fkey` FOREIGN KEY (`profile_user_id`) REFERENCES `profile`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset` ADD CONSTRAINT `asset_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_link` ADD CONSTRAINT `asset_link_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `asset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`profile_user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_freelancer_id_fkey` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancer`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Milestone` ADD CONSTRAINT `Milestone_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `Contract`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Milestone` ADD CONSTRAINT `Milestone_escrow_id_fkey` FOREIGN KEY (`escrow_id`) REFERENCES `Escrow`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_escrow_id_fkey` FOREIGN KEY (`escrow_id`) REFERENCES `Escrow`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transfer` ADD CONSTRAINT `Transfer_escrow_id_fkey` FOREIGN KEY (`escrow_id`) REFERENCES `Escrow`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Refund` ADD CONSTRAINT `Refund_escrow_id_fkey` FOREIGN KEY (`escrow_id`) REFERENCES `Escrow`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Refund` ADD CONSTRAINT `Refund_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `Payment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dispute` ADD CONSTRAINT `Dispute_escrowId_fkey` FOREIGN KEY (`escrowId`) REFERENCES `Escrow`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentMethodRef` ADD CONSTRAINT `PaymentMethodRef_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `profile`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Specialty` ADD CONSTRAINT `Specialty_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `category_skill` ADD CONSTRAINT `category_skill_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `category_skill` ADD CONSTRAINT `category_skill_skill_id_fkey` FOREIGN KEY (`skill_id`) REFERENCES `Skill`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `specialty_skill` ADD CONSTRAINT `specialty_skill_specialty_id_fkey` FOREIGN KEY (`specialty_id`) REFERENCES `Specialty`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `specialty_skill` ADD CONSTRAINT `specialty_skill_skill_id_fkey` FOREIGN KEY (`skill_id`) REFERENCES `Skill`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_category_selection` ADD CONSTRAINT `freelancer_category_selection_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_category_selection` ADD CONSTRAINT `freelancer_category_selection_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_specialty_selection` ADD CONSTRAINT `freelancer_specialty_selection_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_specialty_selection` ADD CONSTRAINT `freelancer_specialty_selection_specialtyId_fkey` FOREIGN KEY (`specialtyId`) REFERENCES `Specialty`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_skill_selection` ADD CONSTRAINT `freelancer_skill_selection_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `freelancer`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `freelancer_skill_selection` ADD CONSTRAINT `freelancer_skill_selection_skillId_fkey` FOREIGN KEY (`skillId`) REFERENCES `Skill`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
