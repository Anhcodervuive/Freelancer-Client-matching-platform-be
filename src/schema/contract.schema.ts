import { z } from 'zod'

import { ContractClosureType, ContractStatus } from '~/generated/prisma'

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
	reason: z.string().trim().min(1, 'Lý do hủy không được để trống').max(2000, 'Lý do hủy tối đa 2000 ký tự').optional()
})

export type CancelMilestoneInput = z.infer<typeof CancelMilestoneSchema>

export const RespondMilestoneCancellationSchema = z.object({
	action: z.enum(['accept', 'decline']),
	reason: z
		.string()
		.trim()
		.min(1, 'Lý do phản hồi không được để trống')
		.max(2000, 'Lý do phản hồi tối đa 2000 ký tự')
		.optional(),
	idempotencyKey: z.string().trim().min(1).max(255).optional()
})

export type RespondMilestoneCancellationInput = z.infer<typeof RespondMilestoneCancellationSchema>

const MonetaryProposalSchema = z.coerce
	.number()
	.min(0, 'Số tiền không được âm')
	.refine(value => Number.isFinite(value), 'Số tiền không hợp lệ')
	.refine(
		value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
		'Số tiền chỉ hỗ trợ tối đa 2 chữ số thập phân'
	)

export const OpenMilestoneDisputeSchema = z.object({
	reason: z
		.string()
		.trim()
		.min(1, 'Lý do mở tranh chấp không được để trống')
		.max(2000, 'Lý do mở tranh chấp tối đa 2000 ký tự'),
	proposedRelease: MonetaryProposalSchema.optional(),
	proposedRefund: MonetaryProposalSchema.optional()
})

export type OpenMilestoneDisputeInput = z.infer<typeof OpenMilestoneDisputeSchema>

export const CreateDisputeNegotiationSchema = z.object({
	releaseAmount: MonetaryProposalSchema,
	refundAmount: MonetaryProposalSchema,
	message: z.string().trim().max(2000, 'Thông điệp đề xuất tối đa 2000 ký tự').optional()
})

export type CreateDisputeNegotiationInput = z.infer<typeof CreateDisputeNegotiationSchema>

export const UpdateDisputeNegotiationSchema = z
	.object({
		releaseAmount: MonetaryProposalSchema.optional(),
		refundAmount: MonetaryProposalSchema.optional(),
		message: z.string().trim().max(2000, 'Thông điệp đề xuất tối đa 2000 ký tự').optional()
	})
	.refine(
		payload =>
			payload.releaseAmount !== undefined ||
			payload.refundAmount !== undefined ||
			(payload.message !== undefined && payload.message.length > 0),
		{
			message: 'Cần cung cấp nội dung cập nhật',
			path: ['message']
		}
	)

export type UpdateDisputeNegotiationInput = z.infer<typeof UpdateDisputeNegotiationSchema>

export const RespondDisputeNegotiationSchema = z
        .object({
                action: z.enum(['accept', 'reject']),
                message: z
                        .string()
                        .trim()
                        .max(2000, 'Phản hồi tối đa 2000 ký tự')
                        .optional(),
        })
        .superRefine((payload, ctx) => {
                if (payload.action === 'reject') {
                        const message = payload.message ?? ''

                        if (message.length === 0) {
                                ctx.addIssue({
                                        code: z.ZodIssueCode.custom,
                                        path: ['message'],
                                        message: 'Vui lòng giải thích lý do từ chối đề xuất',
                                })
                        }
                }
        })

export type RespondDisputeNegotiationInput = z.infer<typeof RespondDisputeNegotiationSchema>

export const SubmitMilestoneSchema = z.object({
	message: z.string().trim().max(5000, 'Nội dung quá dài').optional()
})

export type SubmitMilestoneInput = z.infer<typeof SubmitMilestoneSchema>

const ReviewRatingSchema = z.coerce
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

export const ConfirmArbitrationFeeSchema = z.object({
        paymentMethodRefId: z.string().trim().min(1, 'Thiếu paymentMethodRefId'),
        idempotencyKey: z.string().trim().min(1).max(255).optional()
})

export type ConfirmArbitrationFeeInput = z.infer<typeof ConfirmArbitrationFeeSchema>

const ContractClosureTypeParamSchema = z.preprocess(value => {
        if (typeof value === 'string') {
                return value.toUpperCase()
        }

        return value
}, z.nativeEnum(ContractClosureType))

const ManualContractClosureTypeSchema = ContractClosureTypeParamSchema.refine(
        value => value !== ContractClosureType.AUTO_RELEASED,
        { message: 'Loại kết thúc không hợp lệ' }
)

export const EndContractSchema = z.object({
        closureType: ManualContractClosureTypeSchema,
        reason: z.string().trim().max(2000, 'Lý do kết thúc tối đa 2000 ký tự').optional()
})

export type EndContractInput = z.infer<typeof EndContractSchema>

export const AcceptContractTermsSchema = z
        .object({
                termsVersion: z.string().trim().min(1, 'Thiếu phiên bản điều khoản'),
                userAgent: z.string().trim().min(1).max(500).optional()
        })
        .strict()

export type AcceptContractTermsInput = z.infer<typeof AcceptContractTermsSchema>

export const SubmitContractFeedbackSchema = z.object({
        rating: ReviewRatingSchema,
        comment: z.string().trim().max(5000, 'Nhận xét tối đa 5000 ký tự').optional(),
        wouldHireAgain: z.boolean().optional()
})

export type SubmitContractFeedbackInput = z.infer<typeof SubmitContractFeedbackSchema>

export const UpdateContractFeedbackSchema = SubmitContractFeedbackSchema.partial().refine(
        payload => payload.rating !== undefined || payload.comment !== undefined || payload.wouldHireAgain !== undefined,
        { message: 'Cần cung cấp ít nhất một trường để cập nhật đánh giá' }
)

export type UpdateContractFeedbackInput = z.infer<typeof UpdateContractFeedbackSchema>
