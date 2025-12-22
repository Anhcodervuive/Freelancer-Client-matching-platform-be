import { z } from 'zod'

export const AdminReviewListQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	search: z.string().optional(),
	reviewerRole: z.enum(['CLIENT', 'FREELANCER']).optional(),
	minRating: z.coerce.number().int().min(1).max(5).optional(),
	maxRating: z.coerce.number().int().min(1).max(5).optional(),
	reviewerId: z.string().optional(),
	revieweeId: z.string().optional(),
	contractId: z.string().optional(),
	createdFrom: z.string().optional(),
	createdTo: z.string().optional(),
	sortBy: z.enum(['createdAt', 'rating', 'updatedAt']).default('createdAt'),
	sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export type AdminReviewListQueryInput = z.infer<typeof AdminReviewListQuerySchema>

export const AdminReviewIdParamSchema = z.object({
	reviewId: z.string().min(1)
})

export type AdminReviewIdParamInput = z.infer<typeof AdminReviewIdParamSchema>
