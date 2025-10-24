import { z } from 'zod'

import { ArbitrationEvidenceSourceType, DisputeStatus } from '~/generated/prisma'

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

export const AdminRequestArbitrationFeesSchema: z.ZodType<{ deadlineDays: number }> = z.object({
        deadlineDays: z.coerce.number().int().min(1).max(14).default(7)
})

export type AdminRequestArbitrationFeesInput = z.infer<typeof AdminRequestArbitrationFeesSchema>

const EvidenceItemSchema = z
        .object({
                label: z.string().trim().max(255).optional(),
                description: z.string().trim().max(2000).optional(),
                sourceType: z.nativeEnum(ArbitrationEvidenceSourceType),
                sourceId: z.string().trim().max(255).optional(),
                url: z.string().trim().url().max(2048).optional(),
                assetId: z.string().trim().max(255).optional()
        })
        .superRefine((item, ctx) => {
                const requireSourceId =
                        item.sourceType === ArbitrationEvidenceSourceType.MILESTONE_ATTACHMENT ||
                        item.sourceType === ArbitrationEvidenceSourceType.CHAT_ATTACHMENT
                const requireAssetId = item.sourceType === ArbitrationEvidenceSourceType.ASSET
                const requireUrl = item.sourceType === ArbitrationEvidenceSourceType.EXTERNAL_URL

                if (requireSourceId && !item.sourceId) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'sourceId là bắt buộc với loại chứng cứ đã chọn',
                                path: ['sourceId']
                        })
                }

                if (requireAssetId && !item.assetId) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'assetId là bắt buộc với loại chứng cứ đã chọn',
                                path: ['assetId']
                        })
                }

                if (requireUrl && !item.url) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'url là bắt buộc với loại chứng cứ đã chọn',
                                path: ['url']
                        })
                }

                if (!requireSourceId && !requireAssetId && !requireUrl) {
                        if (!item.assetId && !item.sourceId && !item.url) {
                                ctx.addIssue({
                                        code: z.ZodIssueCode.custom,
                                        message: 'Cần cung cấp ít nhất một nguồn tham chiếu cho chứng cứ',
                                        path: ['sourceId']
                                })
                        }
                }
        })

export const SubmitFinalEvidenceSchema = z
        .object({
                statement: z.string().trim().max(5000).optional(),
                noAdditionalEvidence: z.boolean().optional(),
                items: z.array(EvidenceItemSchema).max(50).optional()
        })
        .superRefine((data, ctx) => {
                const hasStatement = Boolean(data.statement && data.statement.length > 0)
                const hasItems = Boolean(data.items && data.items.length > 0)
                const markedNone = Boolean(data.noAdditionalEvidence)

                if (!hasStatement && !hasItems && !markedNone) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Cần cung cấp luận điểm, danh sách chứng cứ hoặc đánh dấu không có chứng cứ mới'
                        })
                }

                if (markedNone && hasItems) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Không thể vừa đánh dấu không có chứng cứ mới vừa gửi danh sách chứng cứ',
                                path: ['items']
                        })
                }
        })

export type SubmitFinalEvidenceInput = z.infer<typeof SubmitFinalEvidenceSchema>

export const AdminLockDisputeSchema = z.object({
        note: z.string().trim().max(2000).optional()
})

export type AdminLockDisputeInput = z.infer<typeof AdminLockDisputeSchema>

export const AdminGenerateArbitrationDossierSchema = z.object({
        notes: z.string().trim().max(5000).optional(),
        finalize: z.boolean().optional()
})

export type AdminGenerateArbitrationDossierInput = z.infer<typeof AdminGenerateArbitrationDossierSchema>
