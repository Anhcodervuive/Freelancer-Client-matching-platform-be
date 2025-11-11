import Stripe from 'stripe'

import {
        FreelancerPayoutSource,
        FreelancerPayoutStatus,
        Prisma,
        TransferStatus
} from '~/generated/prisma'

import { STRIPE_CONFIG_INFO } from '~/config/environment'
import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { decimalToString } from '~/services/financial/statistics-helpers'
import {
        ensureStripeAccount,
        summarizeCapabilityStatuses,
        type CapabilityStatusSummary
} from '~/services/freelancer/connect-account.service'

const stripe = new Stripe(STRIPE_CONFIG_INFO.API_KEY!)

const ZERO_DECIMAL_CURRENCIES = new Set([
        'bif',
        'clp',
        'djf',
        'gnf',
        'jpy',
        'kmf',
        'krw',
        'mga',
        'pyg',
        'rwf',
        'ugx',
        'vnd',
        'vuv',
        'xaf',
        'xof',
        'xpf'
])

const DEFAULT_HISTORY_LIMIT = 50

const DISABLED_REASON_MESSAGES: Record<string, string> = {
        requirements_past_due: 'Stripe đã khoá chức năng rút tiền vì hồ sơ có thông tin quá hạn',
        requirements_pending_verification: 'Stripe đang tạm khoá payouts cho tới khi hoàn tất kiểm tra hồ sơ',
        requirements_pending_review: 'Stripe đang xem xét hồ sơ payouts của bạn',
        rejected_fraud: 'Stripe nghi ngờ gian lận và đã từ chối payouts',
        rejected_terms_of_service: 'Stripe đã vô hiệu hoá payouts vì vi phạm điều khoản sử dụng',
        rejected_other: 'Stripe đã vô hiệu hoá payouts cho tài khoản này',
        platform_paused: 'Stripe đã khoá payouts theo yêu cầu của nền tảng',
        platform_restricted: 'Stripe đã khoá payouts do nền tảng giới hạn quyền sử dụng',
        listed: 'Stripe đã khoá payouts do tài khoản nằm trong danh sách hạn chế',
        government_request: 'Stripe đã khoá payouts theo yêu cầu của cơ quan quản lý',
        bank_account_restricted: 'Stripe không thể sử dụng tài khoản ngân hàng hiện tại để trả tiền',
        external_account: 'Stripe yêu cầu cập nhật lại tài khoản ngân hàng nhận tiền',
        payouts_not_allowed: 'Stripe chưa cho phép tài khoản này rút tiền'
}

const REQUIREMENT_MESSAGES: Record<string, string> = {
        external_account: 'Cập nhật hoặc thay đổi tài khoản ngân hàng nhận tiền',
        'external_account.verification': 'Xác thực tài khoản ngân hàng nhận tiền',
        'external_account.ownership_declaration': 'Xác nhận quyền sở hữu tài khoản ngân hàng',
        'individual.verification.document': 'Tải giấy tờ xác minh danh tính cá nhân',
        'individual.verification.additional_document': 'Bổ sung giấy tờ xác minh danh tính cá nhân',
        'representative.verification.document': 'Tải giấy tờ xác minh đại diện tài khoản',
        'company.verification.document': 'Tải giấy tờ chứng minh doanh nghiệp',
        'relationship.account_opener.verification.document': 'Tải giấy tờ xác minh người mở tài khoản',
        'relationship.director.verification.document': 'Tải giấy tờ xác minh giám đốc doanh nghiệp',
        'relationship.owner.verification.document': 'Tải giấy tờ xác minh chủ sở hữu doanh nghiệp'
}

const handleStripeError = (error: unknown): never => {
        if (error instanceof Stripe.errors.StripeError) {
                throw new BadRequestException(error.message, ErrorCode.PARAM_QUERY_ERROR)
        }
        throw error
}

const humanizeDisabledReason = (code: string | null | undefined) => {
        if (!code) {
                return null
        }

        const normalized = code.replace(/\./g, '_')
        return DISABLED_REASON_MESSAGES[normalized] ?? `Stripe đã khoá payouts (${code})`
}

const humanizeRequirementCode = (code: string) => {
        const normalized = code.trim()
        if (!normalized) {
                return null
        }

        if (REQUIREMENT_MESSAGES[normalized]) {
                return REQUIREMENT_MESSAGES[normalized]
        }

        const readable = normalized
                .replace(/\./g, ' ')
                .replace(/_/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()

        return `Cập nhật hạng mục "${readable}" trên Stripe`
}

const describeRequirementList = (requirements: string[]) =>
        requirements
                .map(humanizeRequirementCode)
                .filter((message): message is string => Boolean(message))

const describeBankAccountIssue = (bankAccount: Stripe.BankAccount) => {
        const bankName = bankAccount.bank_name ?? 'tài khoản ngân hàng'
        const masked = bankAccount.last4 ? `${bankName} ****${bankAccount.last4}` : bankName
        const failureCode = (bankAccount as Stripe.BankAccount & { failure_code?: string }).failure_code
        const failureDetails = failureCode ?? bankAccount.status ?? null
        const statusHint = failureDetails ? `. Stripe báo cáo trạng thái: ${failureDetails}` : ''

        return `Stripe đã đánh dấu ${masked} không thể nhận payout${statusHint}. Vui lòng cập nhật lại thông tin ngân hàng trên Stripe trước khi rút tiền.`
}

const findProblematicBankAccount = (account: Stripe.Account) => {
        const externalAccounts = account.external_accounts?.data ?? []

        for (const external of externalAccounts) {
                if (external.object !== 'bank_account') {
                        continue
                }

                const bank = external as Stripe.BankAccount
                if (bank.status === 'errored' || bank.status === 'verification_failed') {
                        return bank
                }
        }

        return null
}

const toMinorUnitAmount = (value: Prisma.Decimal | number | string, currency: string) => {
        const decimal = value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value)
        const lowerCurrency = currency.toLowerCase()

        if (ZERO_DECIMAL_CURRENCIES.has(lowerCurrency)) {
                return Number(decimal.toFixed(0))
        }

        return Number(decimal.mul(100).toFixed(0))
}

const fromMinorUnitAmount = (value: number, currency: string) => {
        const lowerCurrency = currency.toLowerCase()
        if (ZERO_DECIMAL_CURRENCIES.has(lowerCurrency)) {
                return new Prisma.Decimal(value)
        }

        return new Prisma.Decimal(value).dividedBy(100)
}

const normalizeCurrency = (value: string | null | undefined) => value?.toUpperCase() ?? ''

const sumBalanceMinorUnits = (entries: Stripe.Balance.Available[], currency: string) => {
        const lowerCurrency = currency.toLowerCase()
        return entries
                .filter(entry => entry.currency.toLowerCase() === lowerCurrency)
                .reduce((sum, entry) => sum + entry.amount, 0)
}

const aggregateBalanceEntries = (items: Stripe.Balance.Available[], currency?: string) => {
        const map = new Map<string, Prisma.Decimal>()
        const currencyFilter = currency ? currency.toUpperCase() : undefined

        for (const item of items) {
                const itemCurrency = normalizeCurrency(item.currency)

                if (!itemCurrency) {
                        continue
                }

                if (currencyFilter && itemCurrency !== currencyFilter) {
                        continue
                }

                const key = itemCurrency
                const existing = map.get(key) ?? new Prisma.Decimal(0)
                const value = fromMinorUnitAmount(item.amount, item.currency)
                map.set(key, existing.plus(value))
        }

        return Array.from(map.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([currencyCode, amount]) => ({
                        currency: currencyCode,
                        amount: decimalToString(amount)
                }))
}

const mapStripePayoutStatus = (status: Stripe.Payout['status']): FreelancerPayoutStatus => {
        switch (status) {
                case 'paid':
                        return FreelancerPayoutStatus.PAID
                case 'in_transit':
                        return FreelancerPayoutStatus.IN_TRANSIT
                case 'canceled':
                        return FreelancerPayoutStatus.CANCELED
                case 'failed':
                        return FreelancerPayoutStatus.FAILED
                case 'pending':
                default:
                        return FreelancerPayoutStatus.PENDING
        }
}

type FreelancerPayoutWithTransfers = Prisma.FreelancerPayoutGetPayload<{
        include: { payoutTransfers: true }
}>

type BalanceEntry = {
        currency: string
        amount: string
}

type PayoutHistoryEntry = {
        id: string
        amount: string
        currency: string
        status: FreelancerPayoutStatus
        source: FreelancerPayoutSource
        stripePayoutId: string | null
        stripeBalanceTransactionId: string | null
        description: string | null
        failureCode: string | null
        failureMessage: string | null
        metadata: Prisma.JsonValue | null
        stripeCreatedAt: string | null
        arrivalDate: string | null
        requestedAt: string | null
        completedAt: string | null
        createdAt: string
        updatedAt: string
        transferIds: string[]
}

type PayoutSummaryEntry = {
        currency: string
        totalAmount: string
        pendingAmount: string
        inTransitAmount: string
        paidAmount: string
        failedAmount: string
        canceledAmount: string
}

type PayoutRestrictions = {
        disabledReason: string | null
        disabledReasonMessage: string | null
        disabledAt: string | null
        currentlyDue: string[]
        currentlyDueMessages: string[]
        pastDue: string[]
        pastDueMessages: string[]
        eventuallyDue: string[]
        eventuallyDueMessages: string[]
        externalAccountIssueMessage: string | null
        capabilityStatuses: CapabilityStatusSummary[]
}

type PayoutSnapshot = {
        payoutsEnabled: boolean
        stripeAccountId: string | null
        balance: {
                available: BalanceEntry[]
                pending: BalanceEntry[]
        }
        summary: PayoutSummaryEntry[]
        history: PayoutHistoryEntry[]
        restrictions: PayoutRestrictions
}

type PayoutSnapshotOptions = {
        currency?: string | undefined
        limit?: number | undefined
}

type CreateFreelancerPayoutInput = {
        amount: string | number
        currency: string
        idempotencyKey?: string | null | undefined
        transferIds?: string[] | undefined
}

const mapPayoutRecord = (record: FreelancerPayoutWithTransfers): PayoutHistoryEntry => ({
        id: record.id,
        amount: decimalToString(record.amount),
        currency: record.currency,
        status: record.status,
        source: record.source,
        stripePayoutId: record.stripePayoutId ?? null,
        stripeBalanceTransactionId: record.stripeBalanceTransactionId ?? null,
        description: record.description ?? null,
        failureCode: record.failureCode ?? null,
        failureMessage: record.failureMessage ?? null,
        metadata: record.metadata ?? null,
        stripeCreatedAt: record.stripeCreatedAt ? record.stripeCreatedAt.toISOString() : null,
        arrivalDate: record.arrivalDate ? record.arrivalDate.toISOString() : null,
        requestedAt: record.requestedAt ? record.requestedAt.toISOString() : null,
        completedAt: record.completedAt ? record.completedAt.toISOString() : null,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        transferIds: record.payoutTransfers.map(link => link.transferId)
})

const computePayoutSummary = (records: FreelancerPayoutWithTransfers[]) => {
        const map = new Map<string, {
                total: Prisma.Decimal
                pending: Prisma.Decimal
                inTransit: Prisma.Decimal
                paid: Prisma.Decimal
                failed: Prisma.Decimal
                canceled: Prisma.Decimal
        }>()

        const ensureEntry = (currency: string) => {
                const existing = map.get(currency)
                if (existing) {
                        return existing
                }

                const entry = {
                        total: new Prisma.Decimal(0),
                        pending: new Prisma.Decimal(0),
                        inTransit: new Prisma.Decimal(0),
                        paid: new Prisma.Decimal(0),
                        failed: new Prisma.Decimal(0),
                        canceled: new Prisma.Decimal(0)
                }
                map.set(currency, entry)
                return entry
        }

        for (const record of records) {
                const currency = record.currency
                const amount = record.amount
                const accumulator = ensureEntry(currency)

                accumulator.total = accumulator.total.plus(amount)

                switch (record.status) {
                        case FreelancerPayoutStatus.PAID:
                                accumulator.paid = accumulator.paid.plus(amount)
                                break
                        case FreelancerPayoutStatus.IN_TRANSIT:
                                accumulator.inTransit = accumulator.inTransit.plus(amount)
                                break
                        case FreelancerPayoutStatus.FAILED:
                                accumulator.failed = accumulator.failed.plus(amount)
                                break
                        case FreelancerPayoutStatus.CANCELED:
                                accumulator.canceled = accumulator.canceled.plus(amount)
                                break
                        case FreelancerPayoutStatus.PENDING:
                        default:
                                accumulator.pending = accumulator.pending.plus(amount)
                                break
                }
        }

        return Array.from(map.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([currency, entry]) => ({
                        currency,
                        totalAmount: decimalToString(entry.total),
                        pendingAmount: decimalToString(entry.pending),
                        inTransitAmount: decimalToString(entry.inTransit),
                        paidAmount: decimalToString(entry.paid),
                        failedAmount: decimalToString(entry.failed),
                        canceledAmount: decimalToString(entry.canceled)
                }))
}

const syncStripePayouts = async (freelancerId: string, stripeAccountId: string) => {
        let startingAfter: string | undefined
        let hasMore = true

        while (hasMore) {
                try {
                        const payouts = await stripe.payouts.list(
                                {
                                        limit: 100,
                                        ...(startingAfter ? { starting_after: startingAfter } : {})
                                },
                                { stripeAccount: stripeAccountId }
                        )

                        for (const payout of payouts.data) {
                                const amount = fromMinorUnitAmount(payout.amount, payout.currency)
                                const mappedStatus = mapStripePayoutStatus(payout.status)
                                const stripeBalanceTransactionId =
                                        typeof payout.balance_transaction === 'string'
                                                ? payout.balance_transaction
                                                : payout.balance_transaction?.id ?? null

                                const metadata: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue =
                                        payout.metadata && Object.keys(payout.metadata).length > 0
                                                ? (payout.metadata as Prisma.InputJsonValue)
                                                : Prisma.JsonNull

                                const baseData: Prisma.FreelancerPayoutUncheckedCreateInput = {
                                        freelancerId,
                                        amount,
                                        currency: payout.currency.toUpperCase(),
                                        status: mappedStatus,
                                        source: FreelancerPayoutSource.STRIPE_DASHBOARD,
                                        stripePayoutId: payout.id,
                                        stripeBalanceTransactionId,
                                        description: payout.description ?? null,
                                        failureCode: payout.failure_code ?? null,
                                        failureMessage: payout.failure_message ?? null,
                                        metadata,
                                        stripeCreatedAt: new Date(payout.created * 1000),
                                        arrivalDate: payout.arrival_date ? new Date(payout.arrival_date * 1000) : null,
                                        requestedAt: new Date(payout.created * 1000),
                                        completedAt:
                                                mappedStatus === FreelancerPayoutStatus.PAID && payout.arrival_date
                                                        ? new Date(payout.arrival_date * 1000)
                                                        : null
                                }

                                await prismaClient.freelancerPayout.upsert({
                                        where: { stripePayoutId: payout.id },
                                        create: baseData,
                                        update: {
                                                amount: baseData.amount,
                                                currency: baseData.currency,
                                                status: { set: mappedStatus },
                                                stripeBalanceTransactionId: baseData.stripeBalanceTransactionId ?? null,
                                                description: baseData.description ?? null,
                                                failureCode: baseData.failureCode ?? null,
                                                failureMessage: baseData.failureMessage ?? null,
                                                metadata: baseData.metadata ?? Prisma.JsonNull,
                                                stripeCreatedAt: baseData.stripeCreatedAt ?? null,
                                                arrivalDate: baseData.arrivalDate ?? null,
                                                requestedAt: baseData.requestedAt ?? null,
                                                completedAt: baseData.completedAt ?? null
                                        }
                                })
                        }

                        hasMore = payouts.has_more

                        if (payouts.data.length > 0) {
                                const lastPayout = payouts.data[payouts.data.length - 1]
                                startingAfter = lastPayout ? lastPayout.id : undefined
                        } else {
                                startingAfter = undefined
                        }

                        if (!startingAfter) {
                                break
                        }
                } catch (error) {
                        handleStripeError(error)
                }
        }
}

const getPayoutSnapshot = async (
        freelancerId: string,
        options?: PayoutSnapshotOptions
): Promise<PayoutSnapshot> => {
        const limit = options?.limit && options.limit > 0 ? Math.min(options.limit, 200) : DEFAULT_HISTORY_LIMIT
        const currencyFilter = options?.currency ? options.currency.toUpperCase() : undefined

        const result = await ensureStripeAccount(freelancerId, { createIfMissing: false })
        const accountRecord = result.accountRecord ?? null
        const account = result.account ?? null

        if (account && accountRecord) {
                await syncStripePayouts(freelancerId, account.id)

                const [balance, payoutRecords] = await Promise.all([
                        stripe.balance
                                .retrieve({}, { stripeAccount: account.id })
                                .catch(handleStripeError),
                        prismaClient.freelancerPayout.findMany({
                                where: {
                                        freelancerId,
                                        ...(currencyFilter ? { currency: currencyFilter } : {})
                                },
                                orderBy: { stripeCreatedAt: 'desc' },
                                take: limit,
                                include: { payoutTransfers: true }
                        }) as Promise<FreelancerPayoutWithTransfers[]>
                ])

                const history = payoutRecords.map(mapPayoutRecord)
                const summary = computePayoutSummary(payoutRecords)

                const payoutsEnabled = account.payouts_enabled ?? false
                const requirements = account.requirements
                const disabledReasonCode =
                        requirements?.disabled_reason ?? accountRecord.disabledReason ?? null
                const disabledReasonMessage = disabledReasonCode
                        ? humanizeDisabledReason(disabledReasonCode)
                        : payoutsEnabled
                          ? null
                          : 'Stripe đã khoá chức năng rút tiền cho tài khoản này'
                const currentlyDue = requirements?.currently_due ?? []
                const pastDue = requirements?.past_due ?? []
                const eventuallyDue = requirements?.eventually_due ?? []
                const problematicBank = findProblematicBankAccount(account)

                const restrictions: PayoutRestrictions = {
                        disabledReason: disabledReasonCode,
                        disabledReasonMessage,
                        disabledAt: requirements?.current_deadline
                                ? new Date(requirements.current_deadline * 1000).toISOString()
                                : accountRecord.disabledAt?.toISOString() ?? null,
                        currentlyDue,
                        currentlyDueMessages: describeRequirementList(currentlyDue),
                        pastDue,
                        pastDueMessages: describeRequirementList(pastDue),
                        eventuallyDue,
                        eventuallyDueMessages: describeRequirementList(eventuallyDue),
                        externalAccountIssueMessage: problematicBank
                                ? describeBankAccountIssue(problematicBank)
                                : null,
                        capabilityStatuses: summarizeCapabilityStatuses(account)
                }

                return {
                        payoutsEnabled,
                        stripeAccountId: accountRecord.stripeAccountId,
                        balance: {
                                available: aggregateBalanceEntries(balance.available, currencyFilter),
                                pending: aggregateBalanceEntries(balance.pending, currencyFilter)
                        },
                        summary,
                        history,
                        restrictions
                }
        }

        const payoutRecords = (await prismaClient.freelancerPayout.findMany({
                where: {
                        freelancerId,
                        ...(currencyFilter ? { currency: currencyFilter } : {})
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                include: { payoutTransfers: true }
        })) as FreelancerPayoutWithTransfers[]

        return {
                payoutsEnabled: false,
                stripeAccountId: null,
                balance: { available: [], pending: [] },
                summary: computePayoutSummary(payoutRecords),
                history: payoutRecords.map(mapPayoutRecord),
                restrictions: {
                        disabledReason: null,
                        disabledReasonMessage: null,
                        disabledAt: null,
                        currentlyDue: [],
                        currentlyDueMessages: [],
                        pastDue: [],
                        pastDueMessages: [],
                        eventuallyDue: [],
                        eventuallyDueMessages: [],
                        externalAccountIssueMessage: null,
                        capabilityStatuses: []
                }
        }
}

const ensureTransfersEligible = async (
        freelancerId: string,
        transferIds: string[],
        currency: string
) => {
        const transfers = await prismaClient.transfer.findMany({
                where: {
                        id: { in: transferIds },
                        currency,
                        escrow: {
                                milestone: {
                                        contract: { freelancerId }
                                }
                        }
                },
                select: { id: true, amount: true, status: true }
        })

        if (transfers.length !== transferIds.length) {
                throw new BadRequestException('Một số giao dịch không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        const invalid = transfers.filter(transfer => transfer.status !== TransferStatus.SUCCEEDED)
        if (invalid.length > 0) {
                throw new BadRequestException('Chỉ có thể rút các khoản đã được giải ngân', ErrorCode.PARAM_QUERY_ERROR)
        }

        const existingLinks = await prismaClient.freelancerPayoutTransfer.findMany({
                where: {
                        transferId: { in: transferIds }
                },
                select: { transferId: true }
        })

        if (existingLinks.length > 0) {
                throw new BadRequestException('Một số giao dịch đã được gắn với yêu cầu rút khác', ErrorCode.PARAM_QUERY_ERROR)
        }

        return transfers.reduce((sum, transfer) => sum.plus(transfer.amount), new Prisma.Decimal(0))
}

const createFreelancerPayout = async (
        freelancerId: string,
        input: CreateFreelancerPayoutInput
): Promise<PayoutHistoryEntry> => {
        const currency = input.currency.trim().toUpperCase()
        const amountDecimal = new Prisma.Decimal(input.amount)

        if (amountDecimal.lte(0)) {
                throw new BadRequestException('Số tiền rút phải lớn hơn 0', ErrorCode.PARAM_QUERY_ERROR)
        }

        const { account, accountRecord } = await ensureStripeAccount(freelancerId, { createIfMissing: false })

        if (!account || !accountRecord) {
                throw new BadRequestException('Freelancer chưa liên kết tài khoản Stripe', ErrorCode.ITEM_NOT_FOUND)
        }

        if (!account.payouts_enabled || !accountRecord.payoutsEnabled) {
                const requirements = account.requirements
                const disabledReasonCode =
                        requirements?.disabled_reason ?? accountRecord.disabledReason ?? null
                const pendingFields = [
                        ...(requirements?.currently_due ?? []),
                        ...(requirements?.past_due ?? []),
                        ...(requirements?.eventually_due ?? [])
                ]
                const pendingDescriptions = describeRequirementList(pendingFields)

                const baseMessage =
                        humanizeDisabledReason(disabledReasonCode) ??
                        'Stripe đã khoá chức năng rút tiền cho tài khoản này'

                let message = baseMessage
                if (pendingDescriptions.length > 0) {
                        message = `${message}. Bạn cần hoàn tất các hạng mục sau trên Stripe: ${pendingDescriptions.join(', ')}.`
                } else {
                        message = `${message}. Vui lòng đăng nhập Stripe Dashboard để cập nhật thông tin trước khi rút tiền.`
                }

                throw new BadRequestException(message, ErrorCode.PARAM_QUERY_ERROR)
        }

        const problematicBank = findProblematicBankAccount(account)
        if (problematicBank) {
                throw new BadRequestException(
                        describeBankAccountIssue(problematicBank),
                        ErrorCode.PARAM_QUERY_ERROR
                )
        }

        if (input.transferIds && input.transferIds.length > 0) {
                const transferTotal = await ensureTransfersEligible(freelancerId, input.transferIds, currency)
                if (!transferTotal.eq(amountDecimal)) {
                        throw new BadRequestException('Số tiền rút không khớp với tổng các khoản đã chọn', ErrorCode.PARAM_QUERY_ERROR)
                }
        }

        const balance = await stripe.balance
                .retrieve({}, { stripeAccount: account.id })
                .catch(handleStripeError)

        const availableMinorUnits = sumBalanceMinorUnits(balance.available, currency)
        const requestedMinorUnits = toMinorUnitAmount(amountDecimal, currency)

        if (requestedMinorUnits > availableMinorUnits) {
                throw new BadRequestException('Số dư khả dụng không đủ để rút', ErrorCode.PARAM_QUERY_ERROR)
        }

        try {
                const payout = await stripe.payouts.create(
                        {
                                amount: requestedMinorUnits,
                                currency: currency.toLowerCase()
                        },
                        {
                                stripeAccount: account.id,
                                ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {})
                        }
                )

                const stripeBalanceTransactionId =
                        typeof payout.balance_transaction === 'string'
                                ? payout.balance_transaction
                                : payout.balance_transaction?.id ?? null

                const metadata: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue =
                        payout.metadata && Object.keys(payout.metadata).length > 0
                                ? (payout.metadata as Prisma.InputJsonValue)
                                : Prisma.JsonNull

                const createData: Prisma.FreelancerPayoutUncheckedCreateInput = {
                        freelancerId,
                        amount: fromMinorUnitAmount(payout.amount, payout.currency),
                        currency,
                        status: mapStripePayoutStatus(payout.status),
                        source: FreelancerPayoutSource.PLATFORM,
                        stripePayoutId: payout.id,
                        stripeBalanceTransactionId,
                        idemKey: input.idempotencyKey ?? null,
                        description: payout.description ?? null,
                        failureCode: payout.failure_code ?? null,
                        failureMessage: payout.failure_message ?? null,
                        metadata,
                        stripeCreatedAt: new Date(payout.created * 1000),
                        arrivalDate: payout.arrival_date ? new Date(payout.arrival_date * 1000) : null,
                        requestedAt: new Date(),
                        completedAt:
                                payout.status === 'paid' && payout.arrival_date
                                        ? new Date(payout.arrival_date * 1000)
                                        : null
                }

                if (input.transferIds && input.transferIds.length > 0) {
                        createData.payoutTransfers = {
                                createMany: {
                                        data: input.transferIds.map(transferId => ({ transferId }))
                                }
                        }
                }

                const record = (await prismaClient.freelancerPayout.create({
                        data: createData,
                        include: { payoutTransfers: true }
                })) as FreelancerPayoutWithTransfers

                return mapPayoutRecord(record)
        } catch (error) {
                handleStripeError(error)
                throw error
        }
}

const freelancerPayoutService = {
        getPayoutSnapshot,
        createFreelancerPayout
}

export type {
        BalanceEntry,
        CreateFreelancerPayoutInput,
        PayoutHistoryEntry,
        PayoutSnapshot,
        PayoutRestrictions,
        PayoutSummaryEntry
}

export default freelancerPayoutService
