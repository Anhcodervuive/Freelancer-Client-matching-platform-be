-- CreateTable
CREATE TABLE `asset` (
    `id` VARCHAR(191) NOT NULL,
    `provider` ENUM('CLOUDINARY', 'S3', 'GCS', 'R2', 'MINIO') NOT NULL,
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
    `ownerType` VARCHAR(191) NOT NULL,
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

-- AddForeignKey
ALTER TABLE `asset` ADD CONSTRAINT `asset_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_link` ADD CONSTRAINT `asset_link_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `asset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
