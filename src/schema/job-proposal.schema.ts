import { z } from 'zod'

import { JobDurationCommitment, JobProposalStatus } from '~/generated/prisma'

const preprocessBidAmount = (value: unknown) => {
        if (value === undefined) return undefined
        if (value === null) return null
        if (typeof value === 'number') return value
        if (typeof value === 'string') {
                const trimmed = value.trim()
                if (trimmed === '') return undefined
                const parsed = Number(trimmed)
                return Number.isNaN(parsed) ? NaN : parsed
        }
        return value
}

const bidAmountSchema = z
        .preprocess(preprocessBidAmount, z.union([z.number().nonnegative(), z.null()]).optional())
        .refine(
                value =>
                        value === undefined ||
                        value === null ||
                        (typeof value === 'number' && Number.isFinite(value)),
                'Giá trị bid không hợp lệ'
        )

const currencySchema = z
        .string()
        .trim()
        .length(3, 'Mã tiền tệ phải có 3 ký tự')
        .transform(value => value.toUpperCase())

const coverLetterSchema = z
        .string()
        .trim()
        .min(10, 'Cover letter cần ít nhất 10 ký tự')
        .max(10000, 'Cover letter tối đa 10000 ký tự')

const optionalCoverLetterSchema = z.preprocess(
        value => {
                if (value === undefined) return undefined
                if (value === null) return null
                if (typeof value === 'string') {
                        const trimmed = value.trim()
                        return trimmed.length === 0 ? null : trimmed
                }
                return value
        },
        z.union([coverLetterSchema, z.null()]).optional()
)

export const CreateJobProposalSchema = z
        .object({
                jobId: z.string().min(1),
                invitationId: z.string().min(1).optional(),
                coverLetter: optionalCoverLetterSchema,
                bidAmount: bidAmountSchema,
                bidCurrency: currencySchema.optional(),
                estimatedDuration: z.nativeEnum(JobDurationCommitment).optional()
        })
        .superRefine((data, ctx) => {
                if (data.bidAmount !== undefined && data.bidAmount !== null && !data.bidCurrency) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Vui lòng chọn loại tiền tệ cho mức bid',
                                path: ['bidCurrency']
                        })
                }

                if ((data.bidAmount === undefined || data.bidAmount === null) && data.bidCurrency) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Vui lòng nhập giá trị bid khi chọn tiền tệ',
                                path: ['bidAmount']
                        })
                }
        })

export const UpdateJobProposalSchema = z
        .object({
                coverLetter: optionalCoverLetterSchema,
                bidAmount: bidAmountSchema,
                bidCurrency: z.union([currencySchema, z.null()]).optional(),
                estimatedDuration: z.union([z.nativeEnum(JobDurationCommitment), z.null()]).optional()
        })
        .superRefine((data, ctx) => {
                if (data.bidAmount !== undefined && data.bidAmount !== null && data.bidCurrency === null) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Vui lòng chọn loại tiền tệ cho mức bid',
                                path: ['bidCurrency']
                        })
                }

                if ((data.bidAmount === undefined || data.bidAmount === null) && data.bidCurrency && data.bidCurrency !== null) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Vui lòng nhập giá trị bid khi chọn tiền tệ',
                                path: ['bidAmount']
                        })
                }
        })

const parseFilterArray = (value: unknown) => {
        if (value === undefined || value === null) return undefined
        const raw = Array.isArray(value) ? value : [value]
        const normalized = raw
                .flatMap(item =>
                        String(item)
                                .split(',')
                                .map(part => part.trim())
                                .filter(Boolean)
                )
        return normalized.length > 0 ? normalized : undefined
}

const JobProposalStatusEnum = z.nativeEnum(JobProposalStatus)

const StatusArraySchema = z.array(JobProposalStatusEnum).optional()

export const JobProposalFilterSchema = z
        .object({
                page: z.coerce.number().int().min(1).default(1),
                limit: z.coerce.number().int().min(1).max(100).default(20),
                jobId: z.string().min(1).optional(),
                freelancerId: z.string().min(1).optional(),
                status: JobProposalStatusEnum.optional(),
                statuses: z.preprocess(parseFilterArray, StatusArraySchema).optional(),
                search: z.string().trim().min(1).optional(),
                submittedFrom: z.coerce.date().optional(),
                submittedTo: z.coerce.date().optional(),
                sortBy: z.enum(['newest', 'oldest', 'bid-asc', 'bid-desc']).optional()
        })
        .superRefine((data, ctx) => {
                if (data.submittedFrom && data.submittedTo && data.submittedFrom > data.submittedTo) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'submittedFrom phải nhỏ hơn hoặc bằng submittedTo',
                                path: ['submittedFrom']
                        })
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'submittedTo phải lớn hơn hoặc bằng submittedFrom',
                                path: ['submittedTo']
                        })
                }
        })

export type CreateJobProposalInput = z.infer<typeof CreateJobProposalSchema>
export type UpdateJobProposalInput = z.infer<typeof UpdateJobProposalSchema>
export type JobProposalFilterInput = z.infer<typeof JobProposalFilterSchema>
