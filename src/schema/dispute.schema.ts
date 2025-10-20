import { z } from 'zod'

import { DisputeStatus } from '~/generated/prisma'

const coerceDate = (value: unknown) => {
    if (value === undefined || value === null || value instanceof Date) return value
    const parsed = new Date(value as string | number)
    return Number.isNaN(parsed.getTime()) ? value : parsed
}

const BooleanLikeSchema = z.preprocess(value => {
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        if (['true', '1', 'yes'].includes(normalized)) {
            return true
        }
        if (['false', '0', 'no'].includes(normalized)) {
            return false
        }
    }
    return value
}, z.boolean())

const DisputeStatusListSchema = z
    .preprocess(value => {
        if (value === undefined || value === null) {
            return value
        }

        if (typeof value === 'string') {
            return value
                .split(',')
                .map(item => item.trim())
                .filter(Boolean)
                .map(item => item.toUpperCase())
        }

        if (Array.isArray(value)) {
            return value.map(item => (typeof item === 'string' ? item.toUpperCase() : item))
        }

        return value
    }, z.array(z.nativeEnum(DisputeStatus)).min(1))
    .optional()

export const AdminDisputeListQuerySchema = z
    .object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        status: DisputeStatusListSchema,
        needsAdmin: BooleanLikeSchema.optional(),
        contractId: z.string().trim().min(1).optional(),
        clientId: z.string().trim().min(1).optional(),
        freelancerId: z.string().trim().min(1).optional(),
        search: z.string().trim().min(1).optional(),
        createdFrom: z.preprocess(coerceDate, z.date().optional()),
        createdTo: z.preprocess(coerceDate, z.date().optional())
    })
    .superRefine((data, ctx) => {
        if (data.createdFrom && data.createdTo && data.createdFrom > data.createdTo) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'createdFrom phải nhỏ hơn hoặc bằng createdTo',
                path: ['createdFrom']
            })
        }
    })

export type AdminDisputeListQueryInput = z.infer<typeof AdminDisputeListQuerySchema>

export const AdminJoinDisputeSchema = z.object({
    reason: z.string().trim().max(500).optional()
})

export type AdminJoinDisputeInput = z.infer<typeof AdminJoinDisputeSchema>
