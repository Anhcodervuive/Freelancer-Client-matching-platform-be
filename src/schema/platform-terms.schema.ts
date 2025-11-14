import { z } from 'zod'

import { PlatformTermsStatus } from '~/generated/prisma'

const parseOptionalDate = (value: unknown) => {
        if (value === undefined || value === null || value === '') {
                return undefined
        }

        if (value instanceof Date) {
                return value
        }

        const parsed = new Date(value as string | number)
        return Number.isNaN(parsed.getTime()) ? value : parsed
}

const parseNullableDate = (value: unknown) => {
        if (value === undefined) {
                return undefined
        }

        if (value === null || value === '') {
                return null
        }

        if (value instanceof Date) {
                return value
        }

        const parsed = new Date(value as string | number)
        return Number.isNaN(parsed.getTime()) ? value : parsed
}

const JsonValueSchema: z.ZodType = z.lazy(() =>
        z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(JsonValueSchema), z.record(z.string(), JsonValueSchema)])
)

export const CreatePlatformTermsSchema = z
        .object({
                version: z.string().trim().min(1).max(100),
                title: z.string().trim().min(1).max(255),
                body: JsonValueSchema,
                status: z.nativeEnum(PlatformTermsStatus).default(PlatformTermsStatus.DRAFT),
                effectiveFrom: z.preprocess(parseOptionalDate, z.date()).optional(),
                effectiveTo: z.preprocess(parseNullableDate, z.date().nullable()).optional()
        })
        .superRefine((data, ctx) => {
                if (data.status === PlatformTermsStatus.ACTIVE && !data.effectiveFrom) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                path: ['effectiveFrom'],
                                message: 'Cần cung cấp effectiveFrom khi kích hoạt điều khoản'
                        })
                }
        })

export type CreatePlatformTermsInput = z.infer<typeof CreatePlatformTermsSchema>

export const UpdatePlatformTermsSchema = z
        .object({
                version: z.string().trim().min(1).max(100).optional(),
                title: z.string().trim().min(1).max(255).optional(),
                body: JsonValueSchema.optional(),
                status: z.nativeEnum(PlatformTermsStatus).optional(),
                effectiveFrom: z.preprocess(parseOptionalDate, z.date()).optional(),
                effectiveTo: z.preprocess(parseNullableDate, z.date().nullable()).optional()
        })
        .refine(data => Object.keys(data).length > 0, {
                message: 'Cần cung cấp dữ liệu để cập nhật điều khoản'
        })
        .superRefine((data, ctx) => {
                if (data.status === PlatformTermsStatus.ACTIVE && data.effectiveFrom === undefined) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                path: ['effectiveFrom'],
                                message: 'Vui lòng chỉ định effectiveFrom khi kích hoạt điều khoản'
                        })
                }
        })

export type UpdatePlatformTermsInput = z.infer<typeof UpdatePlatformTermsSchema>

export const PlatformTermsListQuerySchema = z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        status: z.nativeEnum(PlatformTermsStatus).optional(),
        search: z.string().trim().min(1).optional()
})

export type PlatformTermsListQuery = z.infer<typeof PlatformTermsListQuerySchema>

export const PlatformTermsVersionParamSchema = z.object({
        version: z.string().trim().min(1).max(100)
})

export type PlatformTermsVersionParam = z.infer<typeof PlatformTermsVersionParamSchema>
