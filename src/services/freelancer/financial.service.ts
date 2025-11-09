import { Prisma, TransferStatus } from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { SpendingStatisticsQueryInput } from '~/schema/client-financial.schema'
import clientFinancialService, {
        SpendingStatisticsResult
} from '~/services/client/financial.service'
import {
        Granularity,
        computeDateRange,
        decimalToString,
        formatPeriodKey,
        generatePeriodKeys
} from '~/services/financial/statistics-helpers'
import freelancerPayoutService, {
        BalanceEntry as StripeBalanceEntry,
        PayoutHistoryEntry,
        PayoutSummaryEntry
} from '~/services/freelancer/payout.service'

type TransferSummaryAccumulator = {
        pendingAmount: Prisma.Decimal
        succeededAmount: Prisma.Decimal
        failedAmount: Prisma.Decimal
        reversedAmount: Prisma.Decimal
        counts: {
                pending: number
                succeeded: number
                failed: number
                reversed: number
                total: number
        }
}

type TransferTimelineAccumulator = {
        pendingAmount: Prisma.Decimal
        succeededAmount: Prisma.Decimal
        failedAmount: Prisma.Decimal
        reversedAmount: Prisma.Decimal
        countPending: number
        countSucceeded: number
        countFailed: number
        countReversed: number
}

type EarningsSummaryEntry = {
        currency: string
        escrowHoldingAmount: string
        pendingPayoutAmount: string
        availablePayoutAmount: string
        failedPayoutAmount: string
        reversedPayoutAmount: string
        stripeAvailableBalance: string
        stripePendingBalance: string
        transferCount: {
                total: number
                pending: number
                succeeded: number
                failed: number
                reversed: number
        }
}

type EarningsTimelineEntry = {
        period: string
        pendingAmount: string
        availableAmount: string
        failedAmount: string
        reversedAmount: string
        totalAmount: string
        transferCount: {
                total: number
                pending: number
                succeeded: number
                failed: number
                reversed: number
        }
}

export type FreelancerFinancialOverview = {
        filters: {
                from: string
                to: string
                granularity: Granularity
                currency?: string
        }
        earnings: {
                summary: EarningsSummaryEntry[]
                timelineByCurrency: Record<string, EarningsTimelineEntry[]>
        }
        stripeBalance: {
                available: StripeBalanceEntry[]
                pending: StripeBalanceEntry[]
        }
        payouts: {
                payoutsEnabled: boolean
                stripeAccountId: string | null
                summary: PayoutSummaryEntry[]
                history: PayoutHistoryEntry[]
        }
        spending: SpendingStatisticsResult
}

const createSummaryAccumulator = (): TransferSummaryAccumulator => ({
        pendingAmount: new Prisma.Decimal(0),
        succeededAmount: new Prisma.Decimal(0),
        failedAmount: new Prisma.Decimal(0),
        reversedAmount: new Prisma.Decimal(0),
        counts: {
                pending: 0,
                succeeded: 0,
                failed: 0,
                reversed: 0,
                total: 0
        }
})

const createTimelineAccumulator = (): TransferTimelineAccumulator => ({
        pendingAmount: new Prisma.Decimal(0),
        succeededAmount: new Prisma.Decimal(0),
        failedAmount: new Prisma.Decimal(0),
        reversedAmount: new Prisma.Decimal(0),
        countPending: 0,
        countSucceeded: 0,
        countFailed: 0,
        countReversed: 0
})

const normalizeDecimal = (value: Prisma.Decimal | string | number | null | undefined) => {
        if (value === null || value === undefined) {
                return new Prisma.Decimal(0)
        }

        if (value instanceof Prisma.Decimal) {
                return value
        }

        return new Prisma.Decimal(value)
}

const getFreelancerFinancialOverview = async (
        freelancerId: string,
        filters: SpendingStatisticsQueryInput
): Promise<FreelancerFinancialOverview> => {
        const { rangeStart, rangeEnd, timelineStart, timelineEnd, granularity } = computeDateRange(filters)

        const [escrowBalances, transferSummaries, transfersInRange, spending, payoutSnapshot] = await Promise.all([
                prismaClient.escrow.groupBy({
                        by: ['currency'],
                        where: {
                                milestone: {
                                        contract: { freelancerId }
                                },
                                ...(filters.currency ? { currency: filters.currency } : {})
                        },
                        _sum: {
                                amountFunded: true,
                                amountReleased: true,
                                amountRefunded: true
                        }
                }),
                prismaClient.transfer.groupBy({
                        by: ['currency', 'status'],
                        where: {
                                escrow: {
                                        milestone: {
                                                contract: { freelancerId }
                                        }
                                },
                                ...(filters.currency ? { currency: filters.currency } : {})
                        },
                        _sum: {
                                amount: true
                        },
                        _count: {
                                _all: true
                        }
                }),
                prismaClient.transfer.findMany({
                        where: {
                                escrow: {
                                        milestone: {
                                                contract: { freelancerId }
                                        }
                                },
                                createdAt: {
                                        gte: rangeStart,
                                        lte: rangeEnd
                                },
                                ...(filters.currency ? { currency: filters.currency } : {})
                        },
                        select: {
                                amount: true,
                                currency: true,
                                status: true,
                                createdAt: true
                        },
                        orderBy: { createdAt: 'asc' }
                }),
                clientFinancialService.getSpendingStatistics(freelancerId, filters),
                freelancerPayoutService.getPayoutSnapshot(freelancerId, {
                        currency: filters.currency,
                        limit: 25
                })
        ])

        const escrowHoldings = new Map<string, Prisma.Decimal>()
        const currencies = new Set<string>()

        const stripeAvailableMap = new Map<string, string>()
        const stripePendingMap = new Map<string, string>()

        for (const entry of payoutSnapshot.balance.available) {
                stripeAvailableMap.set(entry.currency, entry.amount)
        }

        for (const entry of payoutSnapshot.balance.pending) {
                stripePendingMap.set(entry.currency, entry.amount)
        }

        if (filters.currency) {
                currencies.add(filters.currency)
        }

        for (const escrow of escrowBalances) {
                currencies.add(escrow.currency)

                const funded = normalizeDecimal(escrow._sum.amountFunded)
                const released = normalizeDecimal(escrow._sum.amountReleased)
                const refunded = normalizeDecimal(escrow._sum.amountRefunded)

                const holding = funded.minus(released).minus(refunded)
                escrowHoldings.set(escrow.currency, holding.lt(0) ? new Prisma.Decimal(0) : holding)
        }

        const transferSummaryMap = new Map<string, TransferSummaryAccumulator>()

        for (const summary of transferSummaries) {
                currencies.add(summary.currency)

                let accumulator = transferSummaryMap.get(summary.currency)
                if (!accumulator) {
                        accumulator = createSummaryAccumulator()
                        transferSummaryMap.set(summary.currency, accumulator)
                }

                const amount = normalizeDecimal(summary._sum.amount)
                const count = summary._count._all
                accumulator.counts.total += count

                switch (summary.status) {
                        case TransferStatus.PENDING:
                                accumulator.pendingAmount = accumulator.pendingAmount.plus(amount)
                                accumulator.counts.pending += count
                                break
                        case TransferStatus.SUCCEEDED:
                                accumulator.succeededAmount = accumulator.succeededAmount.plus(amount)
                                accumulator.counts.succeeded += count
                                break
                        case TransferStatus.FAILED:
                                accumulator.failedAmount = accumulator.failedAmount.plus(amount)
                                accumulator.counts.failed += count
                                break
                        case TransferStatus.REVERSED:
                                accumulator.reversedAmount = accumulator.reversedAmount.plus(amount)
                                accumulator.counts.reversed += count
                                break
                        default:
                                break
                }
        }

        const timelineMap = new Map<string, Map<string, TransferTimelineAccumulator>>()

        for (const transfer of transfersInRange) {
                currencies.add(transfer.currency)

                const periodKey = formatPeriodKey(transfer.createdAt, granularity)
                let periodEntry = timelineMap.get(periodKey)
                if (!periodEntry) {
                        periodEntry = new Map<string, TransferTimelineAccumulator>()
                        timelineMap.set(periodKey, periodEntry)
                }

                let accumulator = periodEntry.get(transfer.currency)
                if (!accumulator) {
                        accumulator = createTimelineAccumulator()
                        periodEntry.set(transfer.currency, accumulator)
                }

                const amount = transfer.amount

                switch (transfer.status) {
                        case TransferStatus.PENDING:
                                accumulator.pendingAmount = accumulator.pendingAmount.plus(amount)
                                accumulator.countPending += 1
                                break
                        case TransferStatus.SUCCEEDED:
                                accumulator.succeededAmount = accumulator.succeededAmount.plus(amount)
                                accumulator.countSucceeded += 1
                                break
                        case TransferStatus.FAILED:
                                accumulator.failedAmount = accumulator.failedAmount.plus(amount)
                                accumulator.countFailed += 1
                                break
                        case TransferStatus.REVERSED:
                                accumulator.reversedAmount = accumulator.reversedAmount.plus(amount)
                                accumulator.countReversed += 1
                                break
                        default:
                                break
                }
        }

        const periodKeys = generatePeriodKeys(timelineStart, timelineEnd, granularity)
        const currencyList = Array.from(currencies).sort()

        const hasStripeBalanceData = payoutSnapshot.stripeAccountId !== null

        const earningsSummary: EarningsSummaryEntry[] = currencyList.map(currency => {
                const summaryAccumulator = transferSummaryMap.get(currency) ?? createSummaryAccumulator()
                const escrowHolding = escrowHoldings.get(currency) ?? new Prisma.Decimal(0)

                const stripeAvailableBalance = normalizeDecimal(stripeAvailableMap.get(currency))
                const stripePendingBalance = normalizeDecimal(stripePendingMap.get(currency))

                const pendingPayoutAmount = hasStripeBalanceData
                        ? stripePendingBalance
                        : summaryAccumulator.pendingAmount
                const availablePayoutAmount = hasStripeBalanceData
                        ? stripeAvailableBalance
                        : summaryAccumulator.succeededAmount

                return {
                        currency,
                        escrowHoldingAmount: decimalToString(escrowHolding),
                        pendingPayoutAmount: decimalToString(pendingPayoutAmount),
                        availablePayoutAmount: decimalToString(availablePayoutAmount),
                        failedPayoutAmount: decimalToString(summaryAccumulator.failedAmount),
                        reversedPayoutAmount: decimalToString(summaryAccumulator.reversedAmount),
                        stripeAvailableBalance: stripeAvailableMap.get(currency) ?? '0',
                        stripePendingBalance: stripePendingMap.get(currency) ?? '0',
                        transferCount: {
                                total: summaryAccumulator.counts.total,
                                pending: summaryAccumulator.counts.pending,
                                succeeded: summaryAccumulator.counts.succeeded,
                                failed: summaryAccumulator.counts.failed,
                                reversed: summaryAccumulator.counts.reversed
                        }
                }
        })

        const timelineByCurrency: Record<string, EarningsTimelineEntry[]> = {}

        if (currencyList.length > 0 && periodKeys.length > 0) {
                for (const currency of currencyList) {
                        timelineByCurrency[currency] = periodKeys.map(periodKey => {
                                const accumulator =
                                        timelineMap.get(periodKey)?.get(currency) ?? createTimelineAccumulator()

                                const totalAmount = accumulator.pendingAmount
                                        .plus(accumulator.succeededAmount)
                                        .plus(accumulator.failedAmount)
                                        .plus(accumulator.reversedAmount)

                                const totalCount =
                                        accumulator.countPending +
                                        accumulator.countSucceeded +
                                        accumulator.countFailed +
                                        accumulator.countReversed

                                return {
                                        period: periodKey,
                                        pendingAmount: decimalToString(accumulator.pendingAmount),
                                        availableAmount: decimalToString(accumulator.succeededAmount),
                                        failedAmount: decimalToString(accumulator.failedAmount),
                                        reversedAmount: decimalToString(accumulator.reversedAmount),
                                        totalAmount: decimalToString(totalAmount),
                                        transferCount: {
                                                total: totalCount,
                                                pending: accumulator.countPending,
                                                succeeded: accumulator.countSucceeded,
                                                failed: accumulator.countFailed,
                                                reversed: accumulator.countReversed
                                        }
                                }
                        })
                }
        }

        return {
                filters: {
                        from: rangeStart.toISOString(),
                        to: rangeEnd.toISOString(),
                        granularity,
                        ...(filters.currency ? { currency: filters.currency } : {})
                },
                earnings: {
                        summary: earningsSummary,
                        timelineByCurrency
                },
                stripeBalance: payoutSnapshot.balance,
                payouts: {
                        payoutsEnabled: payoutSnapshot.payoutsEnabled,
                        stripeAccountId: payoutSnapshot.stripeAccountId,
                        summary: payoutSnapshot.summary,
                        history: payoutSnapshot.history
                },
                spending
        }
}

const freelancerFinancialService = {
        getFreelancerFinancialOverview
}

export default freelancerFinancialService

