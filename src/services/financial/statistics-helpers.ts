import { Prisma } from '~/generated/prisma'

import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { SpendingStatisticsQueryInput } from '~/schema/client-financial.schema'

export type Granularity = SpendingStatisticsQueryInput['granularity']

const DEFAULT_MONTH_RANGE = 6
const DEFAULT_DAY_RANGE = 30

export const decimalToString = (value: Prisma.Decimal) => value.toFixed(2)

export const alignToPeriodStart = (date: Date, granularity: Granularity) => {
        const result = new Date(date.getTime())

        if (granularity === 'month') {
                result.setUTCDate(1)
        }

        result.setUTCHours(0, 0, 0, 0)

        return result
}

export const incrementPeriod = (date: Date, granularity: Granularity) => {
        const result = new Date(date.getTime())

        if (granularity === 'month') {
                result.setUTCMonth(result.getUTCMonth() + 1)
        } else {
                result.setUTCDate(result.getUTCDate() + 1)
        }

        return result
}

export const formatPeriodKey = (date: Date, granularity: Granularity) => {
        const year = date.getUTCFullYear()
        const month = String(date.getUTCMonth() + 1).padStart(2, '0')

        if (granularity === 'month') {
                return `${year}-${month}`
        }

        const day = String(date.getUTCDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
}

export const generatePeriodKeys = (start: Date, end: Date, granularity: Granularity) => {
        const keys: string[] = []
        let cursor = new Date(start.getTime())

        while (cursor <= end) {
                keys.push(formatPeriodKey(cursor, granularity))
                cursor = incrementPeriod(cursor, granularity)
        }

        return keys
}

export const computeDateRange = (filters: SpendingStatisticsQueryInput) => {
        const granularity = filters.granularity ?? 'month'

        const now = new Date()
        const end = filters.to ? new Date(filters.to) : now
        const start = filters.from ? new Date(filters.from) : new Date(end.getTime())

        if (!filters.from) {
                if (granularity === 'day') {
                        start.setUTCDate(start.getUTCDate() - (DEFAULT_DAY_RANGE - 1))
                } else {
                        start.setUTCDate(1)
                        start.setUTCMonth(start.getUTCMonth() - (DEFAULT_MONTH_RANGE - 1))
                }
        }

        const rangeStart = new Date(start.getTime())
        rangeStart.setUTCHours(0, 0, 0, 0)

        const rangeEnd = new Date(end.getTime())
        rangeEnd.setUTCHours(23, 59, 59, 999)

        if (rangeStart > rangeEnd) {
                throw new BadRequestException('Khoảng thời gian không hợp lệ', ErrorCode.PARAM_QUERY_ERROR)
        }

        const timelineStart = alignToPeriodStart(rangeStart, granularity)
        const timelineEnd = alignToPeriodStart(rangeEnd, granularity)

        return { rangeStart, rangeEnd, timelineStart, timelineEnd, granularity }
}

