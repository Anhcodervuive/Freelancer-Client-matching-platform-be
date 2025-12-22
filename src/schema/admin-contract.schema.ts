import { z } from 'zod'

export const AdminContractListQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	search: z.string().optional(),
	status: z.string().optional(),
	clientId: z.string().optional(),
	freelancerId: z.string().optional(),
	createdFrom: z.string().optional(),
	createdTo: z.string().optional(),
	sortBy: z.enum(['createdAt', 'updatedAt', 'totalPaidAmount', 'title']).default('createdAt'),
	sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export type AdminContractListQueryInput = z.infer<typeof AdminContractListQuerySchema>

export const AdminContractDetailParamsSchema = z.object({
	contractId: z.string().min(1)
})

export type AdminContractDetailParamsInput = z.infer<typeof AdminContractDetailParamsSchema>
