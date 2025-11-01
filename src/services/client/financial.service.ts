import { PaymentStatus, Prisma, RefundStatus } from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { SpendingStatisticsQueryInput } from '~/schema/client-financial.schema'
import {
        Granularity,
        computeDateRange,
        decimalToString,
        formatPeriodKey,
        generatePeriodKeys
} from '~/services/financial/statistics-helpers'

type CurrencyAccumulator = {
        gross: Prisma.Decimal
        refund: Prisma.Decimal
        totalCount: number
        succeededCount: number
        refundedCount: number
        withRefundCount: number
}

type PeriodAccumulator = {
        gross: Prisma.Decimal
        refund: Prisma.Decimal
        totalCount: number
        refundedCount: number
        withRefundCount: number
}

type TimelineEntry = {
        period: string
        grossAmount: string
        refundAmount: string
        netAmount: string
        paymentCount: {
                total: number
                refunded: number
                withRefunds: number
        }
}

type CurrencySummary = {
        currency: string
        grossAmount: string
        refundAmount: string
        netAmount: string
        paymentCount: {
                total: number
                succeeded: number
                refunded: number
                withRefunds: number
        }
}

export type SpendingStatisticsResult = {
        filters: {
                from: string
                to: string
                granularity: Granularity
                currency?: string
        }
        summary: CurrencySummary[]
        timelineByCurrency: Record<string, TimelineEntry[]>
}

const createCurrencyAccumulator = (): CurrencyAccumulator => ({
        gross: new Prisma.Decimal(0),
        refund: new Prisma.Decimal(0),
        totalCount: 0,
        succeededCount: 0,
        refundedCount: 0,
        withRefundCount: 0
})

const createPeriodAccumulator = (): PeriodAccumulator => ({
        gross: new Prisma.Decimal(0),
        refund: new Prisma.Decimal(0),
        totalCount: 0,
        refundedCount: 0,
        withRefundCount: 0
})

const getSpendingStatistics = async (
        userId: string,
        filters: SpendingStatisticsQueryInput
): Promise<SpendingStatisticsResult> => {
        const { rangeStart, rangeEnd, timelineStart, timelineEnd, granularity } = computeDateRange(filters)

        const payments = await prismaClient.payment.findMany({
                where: {
                        payerId: userId,
                        status: { in: [PaymentStatus.SUCCEEDED, PaymentStatus.REFUNDED] },
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
                        createdAt: true,
                        refund: {
                                select: {
                                        amount: true,
                                        status: true
                                }
                        }
                },
                orderBy: { createdAt: 'asc' }
        })

        const currencies = new Set<string>()
        if (filters.currency) {
                currencies.add(filters.currency)
        }

        const currencyTotals = new Map<string, CurrencyAccumulator>()
        const timelineMap = new Map<string, Map<string, PeriodAccumulator>>()

        for (const payment of payments) {
                currencies.add(payment.currency)

                const refundAmount =
                        payment.refund && payment.refund.status === RefundStatus.SUCCEEDED
                                ? payment.refund.amount
                                : new Prisma.Decimal(0)

                let totals = currencyTotals.get(payment.currency)
                if (!totals) {
                        totals = createCurrencyAccumulator()
                        currencyTotals.set(payment.currency, totals)
                }

                totals.gross = totals.gross.plus(payment.amount)
                totals.refund = totals.refund.plus(refundAmount)
                totals.totalCount += 1
                if (payment.status === PaymentStatus.SUCCEEDED) {
                        totals.succeededCount += 1
                }
                if (payment.status === PaymentStatus.REFUNDED) {
                        totals.refundedCount += 1
                }
                if (refundAmount.gt(0)) {
                        totals.withRefundCount += 1
                }

                const periodKey = formatPeriodKey(payment.createdAt, granularity)
                let periodData = timelineMap.get(periodKey)
                if (!periodData) {
                        periodData = new Map<string, PeriodAccumulator>()
                        timelineMap.set(periodKey, periodData)
                }

                let periodTotals = periodData.get(payment.currency)
                if (!periodTotals) {
                        periodTotals = createPeriodAccumulator()
                        periodData.set(payment.currency, periodTotals)
                }

                periodTotals.gross = periodTotals.gross.plus(payment.amount)
                periodTotals.refund = periodTotals.refund.plus(refundAmount)
                periodTotals.totalCount += 1
                if (payment.status === PaymentStatus.REFUNDED) {
                        periodTotals.refundedCount += 1
                }
                if (refundAmount.gt(0)) {
                        periodTotals.withRefundCount += 1
                }
        }

        const periodKeys = generatePeriodKeys(timelineStart, timelineEnd, granularity)
        const currencyList = Array.from(currencies).sort()

        const summary: CurrencySummary[] = currencyList.map(currency => {
                const totals = currencyTotals.get(currency) ?? createCurrencyAccumulator()
                const net = totals.gross.minus(totals.refund)

                return {
                        currency,
                        grossAmount: decimalToString(totals.gross),
                        refundAmount: decimalToString(totals.refund),
                        netAmount: decimalToString(net),
                        paymentCount: {
                                total: totals.totalCount,
                                succeeded: totals.succeededCount,
                                refunded: totals.refundedCount,
                                withRefunds: totals.withRefundCount
                        }
                }
        })

        const timelineByCurrency: Record<string, TimelineEntry[]> = {}

        if (currencyList.length > 0 && periodKeys.length > 0) {
                for (const currency of currencyList) {
                        timelineByCurrency[currency] = periodKeys.map(periodKey => {
                                const periodTotals =
                                        timelineMap.get(periodKey)?.get(currency) ?? createPeriodAccumulator()
                                const net = periodTotals.gross.minus(periodTotals.refund)

                                return {
                                        period: periodKey,
                                        grossAmount: decimalToString(periodTotals.gross),
                                        refundAmount: decimalToString(periodTotals.refund),
                                        netAmount: decimalToString(net),
                                        paymentCount: {
                                                total: periodTotals.totalCount,
                                                refunded: periodTotals.refundedCount,
                                                withRefunds: periodTotals.withRefundCount
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
                summary,
                timelineByCurrency
        }
}

const clientFinancialService = {
        getSpendingStatistics
}

export default clientFinancialService
