import { z } from 'zod'

import { ContractStatus } from '~/generated/prisma'

const coerceDate = (value: unknown) => {
        if (value === undefined || value === null || value instanceof Date) return value
        const parsed = new Date(value as string | number)
        return Number.isNaN(parsed.getTime()) ? value : parsed
}

const RoleParamSchema = z
        .string()
        .trim()
        .transform(value => value.toLowerCase())
        .pipe(z.enum(['client', 'freelancer']))

const ContractStatusParamSchema = z.preprocess(value => {
        if (typeof value === 'string') {
                return value.toUpperCase()
        }
        return value
}, z.nativeEnum(ContractStatus))

export const ContractListFilterSchema = z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        role: RoleParamSchema.optional(),
        search: z.string().trim().min(1).optional(),
        status: ContractStatusParamSchema.optional()
})

export type ContractListFilterInput = z.infer<typeof ContractListFilterSchema>

const CurrencySchema = z
        .string()
        .trim()
        .min(3, 'Currency phải có 3 ký tự')
        .max(3, 'Currency phải có 3 ký tự')
        .transform(value => value.toUpperCase())

export const CreateContractMilestoneSchema = z
        .object({
                title: z.string().trim().min(1).max(255),
                amount: z.coerce.number().positive('Số tiền phải lớn hơn 0'),
                currency: CurrencySchema,
                startAt: z.preprocess(coerceDate, z.date().nullable().optional()),
                endAt: z.preprocess(coerceDate, z.date().nullable().optional())
        })
        .superRefine((data, ctx) => {
                if (data.startAt && data.endAt && data.startAt > data.endAt) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'startAt phải nhỏ hơn hoặc bằng endAt',
                                path: ['startAt']
                        })
                }
        })

export type CreateContractMilestoneInput = z.infer<typeof CreateContractMilestoneSchema>

export const PayMilestoneSchema = z.object({
        paymentMethodRefId: z.string().trim().min(1, 'Thiếu paymentMethodRefId'),
        idempotencyKey: z.string().trim().min(1).max(255).optional()
})

export type PayMilestoneInput = z.infer<typeof PayMilestoneSchema>

export const CancelMilestoneSchema = z.object({
        reason: z
                .string()
                .trim()
                .min(1, 'Lý do hủy không được để trống')
                .max(2000, 'Lý do hủy tối đa 2000 ký tự')
                .optional()
})

export type CancelMilestoneInput = z.infer<typeof CancelMilestoneSchema>

export const SubmitMilestoneSchema = z.object({
        message: z
                .string()
                .trim()
                .max(5000, 'Nội dung quá dài')
                .optional()
})

export type SubmitMilestoneInput = z.infer<typeof SubmitMilestoneSchema>

const ReviewRatingSchema = z
        .coerce
        .number()
        .int({ message: 'Điểm đánh giá phải là số nguyên' })
        .min(1, 'Điểm đánh giá tối thiểu là 1')
        .max(5, 'Điểm đánh giá tối đa là 5')

export const ApproveMilestoneSubmissionSchema = z.object({
        reviewNote: z.string().trim().max(5000, 'Nhận xét quá dài').optional(),
        reviewRating: ReviewRatingSchema
})

export type ApproveMilestoneSubmissionInput = z.infer<typeof ApproveMilestoneSubmissionSchema>

export const DeclineMilestoneSubmissionSchema = z.object({
        reviewNote: z.string().trim().min(1, 'Cần nhập lý do từ chối').max(5000, 'Nhận xét quá dài'),
        reviewRating: ReviewRatingSchema.optional()
})

export type DeclineMilestoneSubmissionInput = z.infer<typeof DeclineMilestoneSubmissionSchema>
