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
    `brand` VARCHAR(191) NULL,
    `last4` VARCHAR(191) NULL,
    `exp_month` INTEGER NULL,
    `exp_year` INTEGER NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

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
