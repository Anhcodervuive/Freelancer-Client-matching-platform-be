import { z } from 'zod'

import { JobOfferStatus } from '~/generated/prisma'

const parseBoolean = (value: unknown) => {
        if (value === undefined || value === null) return undefined
        if (typeof value === 'boolean') return value
        const normalized = String(value).trim().toLowerCase()
        if (['true', '1', 'yes'].includes(normalized)) return true
        if (['false', '0', 'no'].includes(normalized)) return false
        return undefined
}

const coerceDate = (value: unknown) => {
        if (value === undefined || value === null || value instanceof Date) return value
        const parsed = new Date(value as string | number)
        return Number.isNaN(parsed.getTime()) ? value : parsed
}

const CurrencySchema = z
        .string()
        .trim()
        .min(3, 'Currency phải có tối thiểu 3 ký tự')
        .max(3, 'Currency phải có tối đa 3 ký tự')

const MessageSchema = z
        .string()
        .trim()
        .max(5000, 'Tin nhắn quá dài')

export const CreateJobOfferSchema = z
        .object({
                jobId: z.string().min(1).optional(),
                freelancerId: z.string().min(1),
                proposalId: z.string().min(1).optional(),
                invitationId: z.string().min(1).optional(),
                title: z.string().trim().min(1).max(255),
                message: MessageSchema.optional(),
                currency: CurrencySchema,
                fixedPrice: z.coerce.number().positive('Giá phải lớn hơn 0'),
                startDate: z.preprocess(coerceDate, z.date().optional()),
                expireAt: z.preprocess(coerceDate, z.date().optional()),
                sendNow: z.preprocess(parseBoolean, z.boolean().optional()).optional()
        })
        .superRefine((data, ctx) => {
                if (!data.jobId && !data.proposalId && !data.invitationId) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Cần cung cấp jobId hoặc proposalId hoặc invitationId',
                                path: ['jobId']
                        })
                }

                if (data.expireAt && data.expireAt.getTime() <= Date.now()) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'expireAt phải ở tương lai',
                                path: ['expireAt']
                        })
                }

                if (data.startDate && data.expireAt && data.startDate > data.expireAt) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'startDate phải trước expireAt',
                                path: ['startDate']
                        })
                }
        })

export type CreateJobOfferInput = z.infer<typeof CreateJobOfferSchema>

const ClientUpdatableStatuses: JobOfferStatus[] = [
        JobOfferStatus.DRAFT,
        JobOfferStatus.SENT,
        JobOfferStatus.WITHDRAWN
]

export const UpdateJobOfferSchema = z
        .object({
                jobId: z.union([z.string().min(1), z.null()]).optional(),
                freelancerId: z.string().min(1).optional(),
                proposalId: z.union([z.string().min(1), z.null()]).optional(),
                invitationId: z.union([z.string().min(1), z.null()]).optional(),
                title: z.string().trim().min(1).max(255).optional(),
                message: z.union([MessageSchema, z.null()]).optional(),
                currency: CurrencySchema.optional(),
                fixedPrice: z.coerce.number().positive('Giá phải lớn hơn 0').optional(),
                startDate: z.preprocess(coerceDate, z.date().nullable().optional()),
                expireAt: z.preprocess(coerceDate, z.date().nullable().optional()),
                status: z.nativeEnum(JobOfferStatus).optional(),
                sendNow: z.preprocess(parseBoolean, z.boolean().optional()).optional()
        })
        .superRefine((data, ctx) => {
                if (data.status && !ClientUpdatableStatuses.includes(data.status)) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Trạng thái không hợp lệ',
                                path: ['status']
                        })
                }

                if (data.sendNow && data.status && data.status !== JobOfferStatus.SENT) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'sendNow chỉ áp dụng khi status là SENT',
                                path: ['sendNow']
                        })
                }

                if (data.expireAt && !(data.expireAt instanceof Date) && data.expireAt !== null) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'expireAt không hợp lệ',
                                path: ['expireAt']
                        })
                }

                if (data.expireAt instanceof Date && data.expireAt.getTime() <= Date.now()) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'expireAt phải ở tương lai',
                                path: ['expireAt']
                        })
                }

                if (
                        data.startDate instanceof Date &&
                        data.expireAt instanceof Date &&
                        data.startDate > data.expireAt
                ) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'startDate phải trước expireAt',
                                path: ['startDate']
                        })
                }
        })

export type UpdateJobOfferInput = z.infer<typeof UpdateJobOfferSchema>

export const JobOfferFilterSchema = z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        jobId: z.string().min(1).optional(),
        freelancerId: z.string().min(1).optional(),
        status: z.nativeEnum(JobOfferStatus).optional(),
        search: z.string().trim().min(1).optional(),
        includeExpired: z.preprocess(parseBoolean, z.boolean().optional()).optional(),
        sortBy: z.enum(['newest', 'oldest', 'price-high', 'price-low']).optional()
})

export type JobOfferFilterInput = z.infer<typeof JobOfferFilterSchema>
