import { z } from 'zod'

export const ListSkillsQuerySchema = z.object({
	search: z.string().trim().optional(),
	page: z.string().optional(),
	limit: z.string().optional(),
	status: z.enum(['deleted', 'all']).default('all')
})

export const OwnerParamsSchema = z.object({
	id: z.string().min(1)
})

export const ListOwnerSkillsQuerySchema = z.object({
	search: z.string().trim().optional(),
	status: z.enum(['all', 'deleted']).default('all'),
	page: z.string().optional(),
	limit: z.string().optional()
})

export const AttachByIdsBodySchema = z.object({
	skillIds: z.array(z.string().min(1)).min(1),
	defaultWeight: z.number().int().min(0).max(100).optional()
})

export const AttachItemsBodySchema = z.object({
	items: z
		.array(
			z.object({
				skillId: z.string().min(1),
				weight: z.number().int().min(0).max(100)
			})
		)
		.min(1),
	defaultWeight: z.number().int().min(0).max(100).optional()
})

export const PatchOwnerSkillParamsSchema = z.object({
	id: z.string().min(1), // ownerId
	skillId: z.string().min(1)
})

export const PatchOwnerSkillBodySchema = z.object({
	weight: z.number().int().min(0).max(100),
	isDeleted: z.boolean().default(false)
})

export const CreateSkillSchema = z.object({
	name: z.string().min(1).max(100),
	slug: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional(),
	isActive: z.boolean().default(true)
})

export const UpdateSkillSchema = CreateSkillSchema.partial()
