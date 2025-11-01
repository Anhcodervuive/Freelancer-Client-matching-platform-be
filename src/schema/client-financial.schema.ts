import { z } from 'zod'

const parseOptionalDate = (value: unknown) => {
        if (value === undefined || value === null) return undefined
        if (value instanceof Date) return value

        const stringValue = String(value).trim()
        if (stringValue.length === 0) return undefined

        const parsed = new Date(stringValue)
        if (Number.isNaN(parsed.getTime())) {
                return value
        }

        return parsed
}

export const SpendingStatisticsQuerySchema = z
        .object({
                from: z.preprocess(parseOptionalDate, z.date().optional()),
                to: z.preprocess(parseOptionalDate, z.date().optional()),
                granularity: z.enum(['day', 'month']).default('month'),
                currency: z
                        .string()
                        .trim()
                        .length(3, 'Currency phải gồm 3 ký tự')
                        .transform(value => value.toUpperCase())
                        .optional()
        })
        .superRefine((data, ctx) => {
                if (data.from && data.to && data.from > data.to) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Thời gian bắt đầu phải nhỏ hơn hoặc bằng thời gian kết thúc',
                                path: ['from']
                        })
                }
        })

export type SpendingStatisticsQueryInput = z.infer<typeof SpendingStatisticsQuerySchema>
